"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Plus, LogOut, ShoppingBag, ShoppingBasket, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreLogs } from "@/components/store-logs";
import { Store } from "@/lib/types";

export default function LandingPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [activeProvisioningStore, setActiveProvisioningStore] = useState<{id: string, name: string} | null>(null);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  const fetchStores = async () => {
    try {
        setLoadingStores(true);
        const response = await fetch("http://localhost:8000/api/stores/", {
            credentials: 'include' 
        });
        if (response.ok) {
            const data = await response.json();
            setStores(data);
        }
    } catch (error) {
        console.error("Failed to fetch stores", error);
    } finally {
        setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (session) {
        fetchStores();
    }
  }, [session]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName) return;

    try {
        const response = await fetch("http://localhost:8000/api/stores/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newStoreName }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            setStores(prev => [...prev, data]);
            setIsCreateOpen(false);
            setNewStoreName("");
            // Open logs immediately
            setActiveProvisioningStore({ id: data.id, name: data.name });
        } else {
            alert("Failed to create store");
        }
    } catch (error) {
        console.error("Error creating store:", error);
        alert("Error creating store");
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <span>Urumi Orchestrator</span>
          </div>

          <nav className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden md:inline-block">
                  {session.user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/login">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {session ? (
          /* Authenticated Dashboard View */
          <div className="container mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Manage your deployed stores and resources.
                </p>
              </div>
              
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                    <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                        <Plus className="h-4 w-4" />
                        Create New Store
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Store</DialogTitle>
                        <DialogDescription>
                            Provision a new WooCommerce store. This will deploy a new Kubernetes namespace and resources.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateStore} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-name">Store Name</Label>
                            <Input 
                                id="store-name" 
                                placeholder="my-awesome-store" 
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Only lowercase letters, numbers, and hyphens.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Provision Store</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingStores ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : stores.length === 0 ? ( 
                /* Empty State */
                <div className="rounded-xl border border-dashed bg-muted/40 p-12 text-center h-[400px] flex flex-col items-center justify-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted shadow-sm">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">No stores deployed</h3>
                <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                    You haven&apos;t created any stores yet. Start by provisioning a new WooCommerce or Medusa store.
                </p>
                <Button variant="outline" className="mt-8 gap-2" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Provision Store
                </Button>
                </div>
            ) : (
                /* Store List */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {stores.map((store) => (
                        <div key={store.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="font-semibold text-lg">{store.name}</div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${
                                    store.status === 'READY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    store.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse'
                                }`}>
                                    {store.status}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    Created: {new Date(store.created_at || "").toLocaleDateString()}
                                </div>
                                
                                {store.url && (
                                    <div className="pt-2">
                                        <a href={store.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                                            Visit Store <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-2">
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveProvisioningStore({ id: store.id, name: store.name })}>
                                        View Logs
                                    </Button>
                                    {/* Delete button could go here */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {activeProvisioningStore && (
                <StoreLogs 
                    storeId={activeProvisioningStore.id} 
                    storeName={activeProvisioningStore.name} 
                    onClose={() => setActiveProvisioningStore(null)}
                    onComplete={(creds) => {
                        // Refresh store list to update status/url
                        fetchStores();
                    }}
                />
            )}

          </div>
        ) : (
          /* Unauthenticated Hero View */
          <div className="relative isolate pt-14 dark:bg-zinc-950">
            <div
              className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
              aria-hidden="true"
            >
              <div
                className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                style={{
                  clipPath:
                    "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                }}
              />
            </div>

            <div className="py-24 sm:py-32 lg:pb-40 animate-in fade-in duration-700">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Deploy E-commerce Stores in Seconds
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    A powerful Kubernetes-native orchestration platform for provisioning WooCommerce and MedusaJS stores with ease. Built for scale, reliability, and speed.
                  </p>
                  <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link href="/login">
                      <Button size="lg" className="h-12 px-8 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 duration-200">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
              aria-hidden="true"
            >
              <div
                className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
                style={{
                  clipPath:
                    "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}