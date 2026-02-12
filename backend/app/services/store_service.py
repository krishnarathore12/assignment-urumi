import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator
from app.models.store import Store, StoreStatus
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

# Resolve chart path relative to project root (backend/../charts/woocommerce)
CHART_PATH = str(Path(__file__).resolve().parent.parent.parent.parent / "charts" / "woocommerce")

# Track which stores are currently being provisioned to prevent concurrent installs
_provisioning_locks: dict[str, asyncio.Lock] = {}

class StoreService:
    @staticmethod
    async def install_helm_chart(store: Store, session: AsyncSession) -> AsyncGenerator[str, None]:
        """
        Installs the WooCommerce Helm chart for the given store.
        Yields log messages during the process.
        Uses a per-store lock to prevent concurrent installs.
        """
        store_id = str(store.id)

        # Get or create a lock for this store
        if store_id not in _provisioning_locks:
            _provisioning_locks[store_id] = asyncio.Lock()
        lock = _provisioning_locks[store_id]

        # If another coroutine is already provisioning this store, skip
        if lock.locked():
            yield "Provisioning already in progress..."
            return

        async with lock:
            namespace = f"store-{store.name}"
            release_name = store.name
            
            # Admin credentials (in a real app, generate these securely)
            admin_password = "password" # store.admin_password
            db_password = "db-password"
            
            cmd = [
                "helm", "upgrade", "--install", release_name, CHART_PATH,
                "--namespace", namespace,
                "--create-namespace",
                "--set", f"ingress.host={store.name}.localhost",
                "--set", f"wordpressPassword={admin_password}",
                "--set", f"mariadb.auth.password={db_password}",
                "--wait", # Wait for pods to be ready
                "--timeout", "10m"
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )

                # Let's use a Queue to aggregate outputs
                queue = asyncio.Queue()
                
                async def stream_reader(stream, level_callback):
                    async for line in stream:
                        decoded = line.decode().strip()
                        level_callback(decoded)
                        await queue.put(decoded)
                    await queue.put(None) # Signal done

                tasks = [
                    asyncio.create_task(stream_reader(process.stdout, logger.info)),
                    asyncio.create_task(stream_reader(process.stderr, logger.warning))
                ]
                
                finished_streams = 0
                while finished_streams < 2:
                    item = await queue.get()
                    if item is None:
                        finished_streams += 1
                    else:
                        yield item

                await process.wait()

                if process.returncode == 0:
                    store.status = StoreStatus.READY
                    store.url = f"http://{store.name}.localhost"
                    store.admin_user = "user"
                    store.admin_password = admin_password
                    yield "Store provisioned successfully!"
                else:
                    store.status = StoreStatus.FAILED
                    yield f"Helm install failed with return code {process.returncode}"
                
                session.add(store)
                await session.commit()
                await session.refresh(store)

            except Exception as e:
                logger.error(f"Error provisioning store: {e}")
                store.status = StoreStatus.FAILED
                session.add(store)
                await session.commit()
                yield f"Error: {str(e)}"
            finally:
                # Clean up the lock entry
                _provisioning_locks.pop(store_id, None)

    @staticmethod
    async def delete_store(store: Store) -> bool:
        namespace = f"store-{store.name}"
        release_name = store.name
        
        cmd = ["helm", "uninstall", release_name, "--namespace", namespace]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.wait()
        
        # Cleanup namespace
        cmd_ns = ["kubectl", "delete", "namespace", namespace]
        process_ns = await asyncio.create_subprocess_exec(
            *cmd_ns,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process_ns.wait()
        
        return process.returncode == 0
