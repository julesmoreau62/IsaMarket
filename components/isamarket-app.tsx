"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  ArrowRight, CalendarClock,
  CircleDollarSign, Clock3, Flag, Home, Loader2, LockKeyhole, LogOut,
  Mail, Menu, Plus, Search, ShieldCheck,
  Sparkles, Trophy, UserRound, WalletCards
} from "lucide-react";
import Image from "next/image";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type Page = "marches" | "paris" | "classement" | "profil" | "admin";
type Role = "player" | "admin";
type Side = "yes" | "no";

type Membership = { user_id: string; role: Role; status: "active" | "suspended" };
type Profile = { user_id: string; username: string; avatar_url: string | null };
type Wallet = { user_id: string; balance: number };
type Market = {
  id: string; creator_id: string; title: string; description: string; category: string;
  image_url: string | null; closes_at: string; resolution_criteria: string;
  conditions_locked: boolean; status: "open" | "yes" | "no" | "cancelled";
  resolution_note: string | null; resolved_at: string | null; created_at: string;
  creation_day: string; yes_pool: number; no_pool: number; total_pool: number;
  wager_count: number; yes_odds: number | null; no_odds: number | null;
  betting_closed_at: string | null; close_note: string | null;
};
type Wager = {
  id: string; subject_id: string; user_id: string; side: Side; amount: number;
  payout: number | null; result: "open" | "won" | "lost" | "refunded"; placed_at: string;
  subjects?: Market | null;
};
type Leader = {
  user_id: string; username: string; avatar_url: string | null; net_profit: number;
  settled_wagers: number; won_wagers: number; success_rate: number;
};
type OddPoint = {
  id: number; subject_id: string; yes_pool: number; no_pool: number;
  yes_odds: number | null; no_odds: number | null; created_at: string;
};
type Report = {
  id: string; subject_id: string | null; reporter_id: string; reason: string;
  status: "open" | "resolved" | "dismissed"; admin_note: string | null; created_at: string;
};
type MemberRow = Membership & { profile?: Profile; wallet?: Wallet };

const categories = ["Toutes", "Cours", "Sport", "Vie de classe", "Culture", "Autre"];
const number = new Intl.NumberFormat("fr-FR");
const compactDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function squid(value: number) {
  return number.format(Math.round(Number(value || 0)));
}

function odd(value: number | null | undefined) {
  return value ? "×" + Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Indisponible";
}

function initials(name: string) {
  return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IS";
}

function message(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Une erreur est survenue.";
}

function AvatarView({ profile, className }: { profile?: Profile | Leader; className?: string }) {
  return (
    <Avatar className={className}>
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
      <AvatarFallback className="bg-[#fde7ee] font-bold text-[#b83d66]">{initials(profile?.username || "IS")}</AvatarFallback>
    </Avatar>
  );
}

export function IsamarketApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [page, setPage] = useState<Page>("marches");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selected, setSelected] = useState<Market | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [live, setLive] = useState(false);
  const [, tick] = useState(0);

  const loadMembership = useCallback(async (user: User) => {
    const { data, error } = await supabase.from("memberships").select("user_id, role, status").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (data) {
      setMembership(data as Membership);
      return data as Membership;
    }
    const result = await supabase.rpc("complete_registration");
    if (result.error) throw result.error;
    const again = await supabase.from("memberships").select("user_id, role, status").eq("user_id", user.id).single();
    if (again.error) throw again.error;
    setMembership(again.data as Membership);
    return again.data as Membership;
  }, []);

  const loadData = useCallback(async (user: User, role?: Role) => {
    setLoadingData(true);
    try {
      const [profileRes, walletRes, marketsRes, wagersRes, leadersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url").eq("user_id", user.id).single(),
        supabase.from("wallets").select("user_id, balance").eq("user_id", user.id).single(),
        supabase.from("subject_market_stats").select("*").order("created_at", { ascending: false }),
        supabase.from("wagers").select("*, subjects:subject_id(*)").eq("user_id", user.id).order("placed_at", { ascending: false }),
        supabase.from("leaderboard").select("*").order("net_profit", { ascending: false }),
      ]);
      const firstError = [profileRes, walletRes, marketsRes, wagersRes, leadersRes].find((item) => item.error)?.error;
      if (firstError) throw firstError;
      setProfile(profileRes.data as Profile);
      setWallet(walletRes.data as Wallet);
      setMarkets((marketsRes.data || []) as Market[]);
      setWagers((wagersRes.data || []) as Wager[]);
      setLeaders((leadersRes.data || []) as Leader[]);
      setDataError(null);
      setSelected((current) => current ? (marketsRes.data || []).find((item) => item.id === current.id) as Market || null : null);

      if (role === "admin") {
        const [membershipRes, profilesRes, walletsRes, reportsRes] = await Promise.all([
          supabase.from("memberships").select("*").order("joined_at"),
          supabase.from("profiles").select("*"),
          supabase.from("wallets").select("*"),
          supabase.from("reports").select("*").order("created_at", { ascending: false }),
        ]);
        const adminError = [membershipRes, profilesRes, walletsRes, reportsRes].find((item) => item.error)?.error;
        if (adminError) throw adminError;
        const byProfile = new Map((profilesRes.data || []).map((item) => [item.user_id, item as Profile]));
        const byWallet = new Map((walletsRes.data || []).map((item) => [item.user_id, item as Wallet]));
        setMembers((membershipRes.data || []).map((item) => ({ ...item, profile: byProfile.get(item.user_id), wallet: byWallet.get(item.user_id) })) as MemberRow[]);
        setReports((reportsRes.data || []) as Report[]);
      }
    } catch (error) {
      setDataError(message(error));
      toast.error(message(error));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(message(error));
      setSession(data.session);
      if (!data.session) setBooting(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (_event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(next);
      if (!next) {
        setMembership(null);
        setProfile(null);
        setWallet(null);
        setMarkets([]);
        setWagers([]); setLeaders([]); setReports([]); setMembers([]);
        setSelected(null); setCreateOpen(false); setPage("marches");
        setRecovering(false); setAuthError(null); setDataError(null); setBooting(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    setBooting(true);
    void (async () => {
      try {
        const member = await loadMembership(session.user);
        if (active && member?.status === "active") await loadData(session.user, member.role);
      } catch (error) { if (active) setAuthError(message(error)); }
      finally { if (active) setBooting(false); }
    })();
    return () => { active = false; };
  // Token refreshes must not reset the active page or start overlapping reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, loadData, loadMembership]);

  const refresh = useCallback(async () => {
    if (session?.user && membership) {
      const member = await loadMembership(session.user);
      if (member?.status === "active") await loadData(session.user, member.role);
    }
  }, [loadData, loadMembership, membership, session]);

  useEffect(() => {
    if (!membership || membership.status !== "active") return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh().catch((error) => setDataError(message(error))); }, 200); };
    const channel = supabase.channel("isamarket-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "subjects" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "wagers" }, schedule)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "odds_history" }, schedule)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const fallback = setInterval(schedule, 30000);
    const clock = setInterval(() => tick((value) => value + 1), 1000);
    window.addEventListener("focus", schedule);
    return () => { clearTimeout(timer); clearInterval(fallback); clearInterval(clock); window.removeEventListener("focus", schedule); void supabase.removeChannel(channel); };
  }, [membership, refresh]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: {
      registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>
    } }).modelContext;
    if (!context?.registerTool || membership?.status !== "active") return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "list_open_markets",
        title: "Lister les sujets ouverts",
        description: "Renvoie les sujets ISAMARKET encore ouverts, avec leurs cagnottes et cotes actuelles.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => markets.filter((market) => market.status === "open" && !market.betting_closed_at && new Date(market.closes_at) > new Date()).map((market) => ({
          id: market.id, title: market.title, closesAt: market.closes_at,
          yesOdds: market.yes_odds, noOdds: market.no_odds, totalPool: market.total_pool
        })),
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "start_market_creation",
        title: "Préparer un nouveau sujet",
        description: "Ouvre le formulaire visible de création d’un sujet sans le publier.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async () => { setCreateOpen(true); return { opened: true }; },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [markets, membership]);

  if (recovering && session) return <PasswordRecovery onDone={() => setRecovering(false)} />;
  if (authError) return <div className="mx-auto max-w-lg space-y-5 p-10"><h1 className="text-2xl font-bold">Connexion interrompue</h1><p role="alert">{authError}</p><Button onClick={() => window.location.reload()}>Réessayer</Button><Button variant="outline" onClick={() => void supabase.auth.signOut()}>Se déconnecter</Button></div>;
  if (booting) return <BootScreen />;
  if (!session) return <AuthScreen />;
  if (!membership) return <BootScreen />;
  if (membership.status === "suspended") return <SuspendedScreen />;

  const navigation: { id: Page; label: string; icon: typeof Home }[] = [
    { id: "marches", label: "Marchés", icon: Home },
    { id: "paris", label: "Mes paris", icon: WalletCards },
    { id: "classement", label: "Classement", icon: Trophy },
    { id: "profil", label: "Profil", icon: UserRound },
    ...(membership.role === "admin" ? [{ id: "admin" as Page, label: "Administration", icon: ShieldCheck }] : []),
  ];

  const content: Record<Page, ReactNode> = {
    marches: <MarketsPage markets={markets} currentUserId={session.user.id} loading={loadingData} onSelect={setSelected} onCreate={() => setCreateOpen(true)} />,
    paris: <MyBetsPage wagers={wagers} />,
    classement: <LeaderboardPage leaders={leaders} />,
    profil: <ProfilePage user={session.user} profile={profile} wallet={wallet} wagers={wagers} onSaved={refresh} />,
    admin: <AdminPage markets={markets} reports={reports} members={members} currentUserId={session.user.id} onChanged={refresh} />,
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#10213b]">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-40 border-b border-[#dfe4ec] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <button className="mr-1 lg:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Ouvrir le menu"><Menu /></button>
          <button className="flex items-center gap-3" onClick={() => setPage("marches")}>
            <Image src="/logo.png" alt="" width={42} height={42} className="rounded-full" priority />
            <span className="hidden text-lg font-black tracking-[-0.04em] sm:block">ISAMARKET</span>
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-[#edf1f7] px-4 py-2 font-bold sm:flex">
              <CircleDollarSign className="size-4 text-[#d84f7a]" />
              {squid(wallet?.balance || 0)} Squids
            </div>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#ed6f96] font-bold text-[#10213b] hover:bg-[#e45e8a]">
              <Plus className="size-4" /><span className="hidden sm:inline">Créer un sujet</span>
            </Button>
            <AvatarView profile={profile || undefined} className="size-9" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className={cn(
          "fixed inset-x-0 top-[72px] z-30 border-b bg-white p-4 shadow-lg lg:sticky lg:inset-auto lg:top-[72px] lg:h-[calc(100vh-72px)] lg:border-b-0 lg:border-r lg:p-5 lg:shadow-none",
          mobileMenu ? "block" : "hidden lg:block"
        )}>
          <nav className="space-y-1">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setPage(id); setMobileMenu(false); }}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold transition",
                  page === id ? "bg-[#142846] text-white" : "text-[#526174] hover:bg-[#edf1f7] hover:text-[#10213b]")}>
                <Icon className="size-5" />{label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl bg-[#fde7ee] p-4">
            <p className="text-sm font-bold">Ton solde</p>
            <p className="mt-1 text-2xl font-black">{squid(wallet?.balance || 0)}</p>
            <p className="text-xs text-[#8b4960]">Squids disponibles</p>
          </div>
          <button onClick={() => void supabase.auth.signOut()} className="mt-5 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#667085] hover:text-[#b42318]">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </aside>
        <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10"><p className="mb-4 text-sm text-muted-foreground">{live ? "Cotes actualisées en direct" : "Reconnexion au direct… actualisation toutes les 30 secondes"} · Heure de Paris</p>{dataError && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4"><p>Les données n’ont pas pu être actualisées : {dataError}</p><Button variant="outline" className="mt-3" onClick={() => void refresh()}>Réessayer</Button></div>}{content[page]}</main>
      </div>

      <CreateMarketDialog quotaUsed={markets.some((market) => market.creator_id === session.user.id && market.creation_day === new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()))} open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      <MarketDialog key={selected?.id || "none"} market={selected} user={session.user} balance={wallet?.balance || 0} onOpenChange={(open) => !open && setSelected(null)} onChanged={async () => {
        await refresh();
        if (selected) {
          const latest = await supabase.from("subject_market_stats").select("*").eq("id", selected.id).single();
          if (!latest.error) setSelected(latest.data as Market);
        }
      }} />
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101f3a] text-white">
      <div className="text-center"><Image src="/logo.png" width={84} height={84} alt="" className="mx-auto rounded-full" priority /><Loader2 className="mx-auto mt-6 size-6 animate-spin text-[#ed6f96]" /><p className="mt-3 text-sm text-white/60">Ouverture du marché…</p></div>
    </div>
  );
}

function PasswordRecovery({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe enregistré."); onDone();
    } catch (error) { toast.error(message(error)); } finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6"><Toaster richColors /><h1 className="text-3xl font-black">Nouveau mot de passe</h1><form onSubmit={submit} className="mt-6 space-y-5"><Label htmlFor="new-password">Mot de passe (8 caractères minimum)</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><Button disabled={busy}>Enregistrer le mot de passe</Button></form></main>;
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        if (!data.session) toast.success("Vérifie ta boîte mail pour confirmer ton adresse.");
      }
    } catch (error) { toast.error(message(error)); } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email) return toast.error("Renseigne d’abord ton adresse e-mail.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) toast.error(error.message); else toast.success("Le lien de réinitialisation a été envoyé.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
        <section className="relative hidden overflow-hidden border-r border-border bg-[#101f3a] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#ed6f96]/20 blur-3xl" />
          <div className="relative flex items-center gap-3"><Image src="/logo.png" alt="Logo ISA" width={52} height={52} className="rounded-full" priority /><div><p className="text-xl font-black tracking-[-0.04em]">ISAMARKET</p><p className="text-sm text-white/60">Le marché privé de la promo</p></div></div>
          <div className="relative max-w-xl pb-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70"><Sparkles className="size-4 text-[#ed6f96]" />1 000 Squids offerts à chaque membre</div>
            <h1 className="max-w-lg text-6xl font-black leading-[0.97] tracking-[-0.065em]">Des pronostics.<br />Des cotes vivantes.<br />Zéro argent réel.</h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/65">Crée un sujet, mise sur Oui ou Non et grimpe au classement de la classe.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[["1 / jour", "sujet par membre"], ["Oui / Non", "deux réponses"], ["0 €", "argent réel"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-sm text-white/70">{label}</p></div>)}
            </div>
          </div>
        </section>
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden"><Image src="/logo.png" alt="Logo ISA" width={48} height={48} className="rounded-full" priority /><div><p className="text-lg font-black">ISAMARKET</p><p className="text-sm text-muted-foreground">Le marché privé de la promo</p></div></div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d14f79]">Accès privé</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">{mode === "login" ? "Rejoins le marché." : "Crée ton compte."}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{mode === "login" ? "Connecte-toi avec ton adresse confirmée." : "Ton e-mail devra être confirmé avant ta première connexion."}</p>
            <form className="mt-9 space-y-5" onSubmit={submit}>
              <Field icon={<Mail />} label="Adresse e-mail"><Input aria-label="Adresse e-mail" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="prenom.nom@exemple.fr" className="h-12 pl-10" /></Field>
              <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="password">Mot de passe</Label>{mode === "login" && <button type="button" onClick={() => void resetPassword()} className="text-sm font-semibold text-[#c7446d] hover:underline">Mot de passe oublié ?</button>}</div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="8 caractères minimum" className="h-12 pl-10" /></div></div>
              <Button disabled={busy} className="h-12 w-full bg-[#142846] text-base font-bold text-white hover:bg-[#0d1d35]">{busy ? <Loader2 className="animate-spin" /> : <>{mode === "login" ? "Se connecter" : "Créer mon compte"}<ArrowRight /></>}</Button>
            </form>
            <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" /></div>
            <Button variant="outline" className="h-12 w-full text-base font-bold" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Créer mon compte" : "J’ai déjà un compte"}</Button>
            <p className="mt-8 text-center text-sm leading-relaxed text-muted-foreground">Les Squids sont une monnaie fictive, sans achat, retrait ni conversion possible.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label><div className="relative [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-1/2 [&>svg]:size-4 [&>svg]:-translate-y-1/2 [&>svg]:text-muted-foreground">{icon}{children}</div></div>;
}

function SuspendedScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6"><Card className="max-w-md"><CardContent className="p-8 text-center"><LockKeyhole className="mx-auto size-10 text-[#d14f79]" /><h1 className="mt-5 text-2xl font-black">Compte suspendu</h1><p className="mt-2 text-muted-foreground">L’administrateur de la classe doit réactiver ton accès.</p><Button variant="outline" className="mt-6" onClick={() => void supabase.auth.signOut()}>Se déconnecter</Button></CardContent></Card></div>;
}

function PageHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7446d]">{eyebrow}</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1></div>{action}</div>;
}

function MarketsPage({ markets, currentUserId, loading, onSelect, onCreate }: { markets: Market[]; currentUserId: string; loading: boolean; onSelect: (market: Market) => void; onCreate: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [status, setStatus] = useState("open");
  const filtered = markets.filter((market) => (status === "all" || (status === "resolved" ? market.status !== "open" : market.status === status && !market.betting_closed_at && new Date(market.closes_at) > new Date())) && (category === "Toutes" || market.category === category) && (market.title + " " + market.description).toLowerCase().includes(query.toLowerCase()));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const usedQuota = markets.some((market) => market.creator_id === currentUserId && market.creation_day === today);

  return <>
    <PageHeading eyebrow="Marchés de la classe" title="Sur quoi tu mises ?" action={<Button className="hidden bg-[#ed6f96] font-bold text-[#10213b] hover:bg-[#e45e8a] sm:flex" onClick={onCreate}><Plus />Nouveau sujet</Button>} />
    <div className="mb-6 grid gap-3 rounded-2xl border bg-white p-3 shadow-sm md:grid-cols-[1fr_auto]">
      <div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Rechercher un sujet" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un sujet…" className="h-11 border-0 bg-[#f3f5f9] pl-10 shadow-none" /></div>
      <Tabs value={status} onValueChange={setStatus}><TabsList className="h-11 w-full md:w-auto"><TabsTrigger value="open">Ouverts</TabsTrigger><TabsTrigger value="all">Tous</TabsTrigger><TabsTrigger value="resolved">Résolus</TabsTrigger></TabsList></Tabs>
    </div>
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", category === item ? "bg-[#142846] text-white" : "border bg-white text-[#59677a] hover:border-[#ed6f96]")}>{item}</button>)}</div>
    {usedQuota && <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#f2ccd8] bg-[#fff4f7] px-4 py-3 text-sm text-[#8b3754]"><Clock3 className="size-4" />Ton sujet du jour est publié. Tu pourras en créer un autre demain, heure de Paris.</div>}
    {loading ? <MarketSkeleton /> : filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map((market) => <MarketCard key={market.id} market={market} onClick={() => onSelect(market)} />)}</div> : <Empty className="min-h-72 border bg-white"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>Aucun sujet ici</EmptyTitle><EmptyDescription>Change les filtres ou crée le premier sujet de la journée.</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={onCreate}><Plus />Créer un sujet</Button></EmptyContent></Empty>}
  </>;
}

function MarketSkeleton() {
  return <div className="grid gap-4 xl:grid-cols-2">{[1,2,3,4].map((key) => <div key={key} className="rounded-2xl border bg-white p-5"><Skeleton className="h-5 w-24" /><Skeleton className="mt-4 h-7 w-4/5" /><Skeleton className="mt-2 h-4 w-full" /><div className="mt-6 grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div></div>)}</div>;
}

function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const closed = market.status !== "open" || Boolean(market.betting_closed_at) || new Date(market.closes_at) <= new Date();
  return <button onClick={onClick} className="group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ed6f96]/70 hover:shadow-md">
    {market.image_url && <img src={market.image_url} alt="" className="h-36 w-full object-cover" />}
    <div className="p-5">
      <div className="flex items-center justify-between gap-3"><Badge variant="secondary">{market.category}</Badge><span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="size-4" />{closed ? "Clôturé" : compactDate.format(new Date(market.closes_at))}</span></div>
      <h2 className="mt-4 text-xl font-black leading-snug tracking-[-0.025em] group-hover:text-[#b53660]">{market.title}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{market.description}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#e7f8f3] p-3"><div className="flex justify-between text-sm font-bold text-[#0d725c]"><span>Oui</span><span>{odd(market.yes_odds)}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#c3ebdf]"><div className="h-full rounded-full bg-[#20a884]" style={{ width: market.total_pool ? (Number(market.yes_pool) / Number(market.total_pool)) * 100 + "%" : "0%" }} /></div></div>
        <div className="rounded-xl bg-[#fdebf0] p-3"><div className="flex justify-between text-sm font-bold text-[#aa365d]"><span>Non</span><span>{odd(market.no_odds)}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#f7cdd9]"><div className="h-full rounded-full bg-[#df5d88]" style={{ width: market.total_pool ? (Number(market.no_pool) / Number(market.total_pool)) * 100 + "%" : "0%" }} /></div></div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm"><span className="font-bold">{squid(market.total_pool)} Squids engagés</span><span className="text-muted-foreground">{number.format(market.wager_count)} mise{market.wager_count > 1 ? "s" : ""}</span></div>
    </div>
  </button>;
}

function CreateMarketDialog({ open, onOpenChange, onCreated, quotaUsed }: { quotaUsed: boolean; open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const values = new FormData(event.currentTarget);
    const closes = new Date(String(values.get("closes_at")));
    if (!Number.isFinite(closes.getTime()) || closes <= new Date()) { toast.error("Choisis une clôture future."); setBusy(false); return; }
    const { error } = await supabase.rpc("create_subject", {
      p_title: values.get("title"), p_description: values.get("description"),
      p_category: values.get("category"), p_image_url: values.get("image_url") || null,
      p_closes_at: closes.toISOString(), p_resolution_criteria: values.get("criteria")
    });
    if (error) toast.error(message(error)); else { toast.success("Sujet publié."); onOpenChange(false); await onCreated(); }
    setBusy(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-2xl font-black">Créer un sujet</DialogTitle><DialogDescription>{quotaUsed ? "Quota utilisé : 0 sujet disponible aujourd’hui." : "Quota disponible : 1 sujet aujourd’hui."} Renouvellement à minuit, heure de Paris. Une annulation ne restitue pas le quota.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="title">Question Oui / Non</Label><Input id="title" name="title" required minLength={8} maxLength={120} placeholder="La promo dépassera-t-elle 80 % de réussite ?" /></div>
    <div className="space-y-2"><Label htmlFor="description">Contexte</Label><Textarea id="description" name="description" required minLength={20} maxLength={2000} placeholder="Donne les informations utiles pour comprendre le sujet." /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Catégorie</Label><Select name="category" defaultValue="Vie de classe"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{categories.slice(1).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="closes_at">Clôture (heure de cet appareil)</Label><Input id="closes_at" name="closes_at" type="datetime-local" required /></div></div>
    <div className="space-y-2"><Label htmlFor="image_url">Image (URL facultative)</Label><Input id="image_url" name="image_url" type="url" placeholder="https://…" /></div>
    <div className="space-y-2"><Label htmlFor="criteria">Critères précis de résolution</Label><Textarea id="criteria" name="criteria" required minLength={20} maxLength={1200} placeholder="Indique la source et la règle qui permettront de trancher sans ambiguïté." /><p className="text-xs text-muted-foreground">Le titre, le contexte, l’échéance et ces critères ne seront plus modifiables dès la première mise.</p></div>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button disabled={busy || quotaUsed} className="bg-[#142846]">{busy ? <Loader2 className="animate-spin" /> : "Publier le sujet"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function MarketDialog({ market, user, balance, onOpenChange, onChanged }: { market: Market | null; user: User; balance: number; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<OddPoint[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const wagerLock = useRef(false);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    if (!market) return;
    let active = true;
    supabase.from("odds_history").select("*").eq("subject_id", market.id).order("id", { ascending: false }).limit(300).then(({ data, error }) => {
      if (active) { setHistoryError(Boolean(error)); if (!error) setHistory(((data || []) as OddPoint[]).reverse()); }
    });
    return () => { active = false; };
  }, [market]);

  if (!market) return null;
  const value = Number(amount);
  const simulatedYes = Number(market.yes_pool) + (side === "yes" ? value : 0);
  const simulatedNo = Number(market.no_pool) + (side === "no" ? value : 0);
  const total = simulatedYes + simulatedNo;
  const simulatedOdd = side === "yes" ? (simulatedYes ? total / simulatedYes : null) : (simulatedNo ? total / simulatedNo : null);
  const potential = simulatedOdd ? Math.floor(value * simulatedOdd) : 0;
  const open = market.status === "open" && !market.betting_closed_at && new Date(market.closes_at) > new Date();

  async function wager() {
    if (!market || wagerLock.current) return;
    if (!Number.isSafeInteger(value) || value <= 0) return toast.error("Saisis une mise entière et positive.");
    if (value > balance) return toast.error("Solde insuffisant.");
    const signature = `${market.id}:${side}:${value}`;
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    wagerLock.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("place_wager", { p_subject_id: market.id, p_side: side, p_amount: value, p_request_id: attempt.current.id });
      if (error) throw error;
      attempt.current = null; toast.success("Mise validée. Elle est désormais irréversible."); setAmount(""); await onChanged();
    } catch (error) { toast.error(message(error)); }
    finally { setBusy(false); wagerLock.current = false; }
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!market) return;
    const reason = String(new FormData(event.currentTarget).get("reason"));
    const { error } = await supabase.from("reports").insert({ subject_id: market.id, reporter_id: user.id, reason });
    if (error) toast.error(message(error)); else { toast.success("Signalement transmis."); setReportOpen(false); }
  }

  return <><Dialog open={Boolean(market)} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-4xl"><div className="grid lg:grid-cols-[1fr_340px]">
    <div className="p-6 sm:p-8">{market.image_url && <img src={market.image_url} alt="" className="mb-6 h-52 w-full rounded-2xl object-cover" />}<div className="flex items-center justify-between"><Badge variant="secondary">{market.category}</Badge><button onClick={() => setReportOpen(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#c7446d]"><Flag className="size-4" />Signaler</button></div><DialogHeader><DialogTitle className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em]">{market.title}</DialogTitle><DialogDescription>Pronostic Oui / Non · Cagnotte commune en Squids</DialogDescription></DialogHeader><p className="mt-4 leading-relaxed text-muted-foreground">{market.description}</p>
      <div className="mt-6 rounded-2xl border bg-[#f6f8fb] p-4"><p className="flex items-center gap-2 font-bold"><ShieldCheck className="size-4 text-[#c7446d]" />Règle de résolution</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{market.resolution_criteria}</p>{market.conditions_locked && <p className="mt-3 text-xs font-semibold text-[#8b4960]">Conditions verrouillées depuis la première mise.</p>}</div>
      {historyError && <p role="alert" className="mt-5 text-sm text-red-700">Historique indisponible. Réouvre ce sujet pour réessayer.</p>}{!historyError && history.length === 0 && <p className="mt-5 text-sm text-muted-foreground">L’historique des cotes commencera à la première mise.</p>}{history.length > 0 && <div className="mt-7"><h3 className="font-black">Historique des cotes</h3><div className="mt-3 h-52 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#20a884" stopOpacity={0.3}/><stop offset="95%" stopColor="#20a884" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} fontSize={12}/><YAxis fontSize={12}/><Tooltip labelFormatter={(v) => compactDate.format(new Date(v))} formatter={(v) => odd(Number(v))}/><Area type="stepAfter" dot={{ r: 3 }} dataKey="yes_odds" name="Oui" stroke="#20a884" fill="url(#yesFill)" /><Area type="stepAfter" dot={{ r: 3 }} dataKey="no_odds" name="Non" stroke="#df5d88" fill="transparent" /></AreaChart></ResponsiveContainer></div></div>}
      {market.close_note && <p className="mt-4 text-sm text-muted-foreground">Clôture anticipée : {market.close_note}</p>}{market.resolution_note && <div className="mt-6 rounded-xl border border-[#d9e3f0] bg-white p-4"><p className="font-bold">Décision : {market.status === "yes" ? "Oui" : market.status === "no" ? "Non" : "Annulé"}</p><p className="mt-1 text-sm text-muted-foreground">{market.resolution_note}</p></div>}
    </div>
    <aside className="border-t bg-[#f8f9fc] p-6 lg:border-l lg:border-t-0"><p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><CalendarClock className="size-4" />Clôture {compactDate.format(new Date(market.closes_at))}</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setSide("yes")} className={cn("rounded-xl border-2 p-4 text-left", side === "yes" ? "border-[#20a884] bg-[#e7f8f3]" : "border-transparent bg-white")}><span className="text-sm font-bold text-[#0d725c]">Oui</span><span className="mt-1 block text-xl font-black">{odd(market.yes_odds)}</span><span className="text-xs text-muted-foreground">{squid(market.yes_pool)} S</span></button><button onClick={() => setSide("no")} className={cn("rounded-xl border-2 p-4 text-left", side === "no" ? "border-[#df5d88] bg-[#fdebf0]" : "border-transparent bg-white")}><span className="text-sm font-bold text-[#aa365d]">Non</span><span className="mt-1 block text-xl font-black">{odd(market.no_odds)}</span><span className="text-xs text-muted-foreground">{squid(market.no_pool)} S</span></button></div>
      {open ? <><div className="mt-6 space-y-2"><Label htmlFor="amount">Montant de la mise</Label><p className="text-sm text-muted-foreground">Disponible : {squid(balance)} Squids</p><div className="relative"><Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} step={1} max={balance} inputMode="numeric" className="h-12 pr-20 text-lg font-bold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Squids</span></div></div><div className="mt-4 rounded-xl bg-white p-4 text-sm"><div className="flex justify-between"><span>Cote simulée</span><strong>{odd(simulatedOdd)}</strong></div><div className="mt-2 flex justify-between"><span>Retour estimé, mise incluse</span><strong>{potential ? "≈ " + squid(potential) + " S" : "—"}</strong></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Simulation après ta nouvelle mise. Le gain final dépend de toute la cagnotte à la clôture. La répartition n’est pas une probabilité objective.</p></div><Button disabled={busy || !Number.isSafeInteger(value) || value <= 0 || value > balance} onClick={() => void wager()} className={cn("mt-5 h-12 w-full font-black text-white", side === "yes" ? "bg-[#16876c] hover:bg-[#0f7059]" : "bg-[#c7446d] hover:bg-[#ad365d]")}>{busy ? <Loader2 className="animate-spin" /> : "Miser " + squid(value) + " sur " + (side === "yes" ? "Oui" : "Non")}</Button><p className="mt-3 text-center text-xs text-muted-foreground">Toute mise validée est irréversible.</p></> : <div className="mt-6 rounded-xl border border-dashed p-5 text-center"><LockKeyhole className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 font-bold">Mises closes</p><p className="text-sm text-muted-foreground">{market.status === "open" ? "En attente du résultat." : "Ce sujet est terminé."}</p></div>}
    </aside>
  </div></DialogContent></Dialog>
  <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent><DialogHeader><DialogTitle>Signaler ce sujet</DialogTitle><DialogDescription>Explique clairement le problème à l’administrateur.</DialogDescription></DialogHeader><form onSubmit={report} className="space-y-4"><Textarea name="reason" required minLength={10} placeholder="Pourquoi ce sujet doit-il être examiné ?" /><DialogFooter><Button type="button" variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button><Button type="submit">Envoyer</Button></DialogFooter></form></DialogContent></Dialog></>;
}

function MyBetsPage({ wagers }: { wagers: Wager[] }) {
  const open = wagers.filter((wager) => wager.result === "open");
  const settled = wagers.filter((wager) => wager.result !== "open");
  return <><PageHeading eyebrow="Portefeuille" title="Mes paris" /><h2 className="mb-4 text-xl font-black">En cours <span className="text-muted-foreground">({open.length})</span></h2><BetList wagers={open} empty="Tu n’as aucune mise en cours." /><div className="mt-10"><h2 className="mb-4 text-xl font-black">Historique <span className="text-muted-foreground">({settled.length})</span></h2><BetList wagers={settled} empty="Tes résultats apparaîtront ici." /></div></>;
}

function BetList({ wagers, empty }: { wagers: Wager[]; empty: string }) {
  if (!wagers.length) return <Empty className="min-h-44 border bg-white"><EmptyHeader><EmptyMedia variant="icon"><WalletCards /></EmptyMedia><EmptyTitle>{empty}</EmptyTitle></EmptyHeader></Empty>;
  return <div className="space-y-3">{wagers.map((wager) => <div key={wager.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl font-black", wager.side === "yes" ? "bg-[#e7f8f3] text-[#0d725c]" : "bg-[#fdebf0] text-[#aa365d]")}>{wager.side === "yes" ? "OUI" : "NON"}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{wager.subjects?.title || "Sujet"}</p><p className="mt-1 text-sm text-muted-foreground">{compactDate.format(new Date(wager.placed_at))} · Mise de {squid(wager.amount)} Squids</p></div><div className="text-left sm:text-right"><Badge variant={wager.result === "won" ? "default" : wager.result === "lost" ? "destructive" : "secondary"}>{wager.result === "open" ? "En cours" : wager.result === "won" ? "Gagné" : wager.result === "lost" ? "Perdu" : "Remboursé"}</Badge>{wager.payout !== null && <p className="mt-1 font-black">{squid(wager.payout)} S</p>}</div></div>)}</div>;
}

function LeaderboardPage({ leaders }: { leaders: Leader[] }) {
  return <><PageHeading eyebrow="Classement général" title="Le podium des Squids" /><div className="mb-7 grid gap-4 md:grid-cols-3">{[1,0,2].map((index, visual) => { const leader = leaders[index]; if (!leader) return <div key={index} className="hidden md:block" />; return <div key={leader.user_id} className={cn("rounded-2xl border bg-white p-6 text-center shadow-sm", visual === 1 && "md:-translate-y-3 md:border-[#ed6f96]")}><div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-[#142846] font-black text-white">{index + 1}</div><AvatarView profile={leader} className="mx-auto size-14" /><p className="mt-3 font-black">{leader.username}</p><p className={cn("mt-1 text-2xl font-black", leader.net_profit >= 0 ? "text-[#16876c]" : "text-[#c7446d]")}>{leader.net_profit >= 0 ? "+" : ""}{squid(leader.net_profit)} S</p><p className="text-xs text-muted-foreground">bénéfice net réalisé</p></div>; })}</div><div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><Table><TableHeader><TableRow><TableHead className="w-16">Rang</TableHead><TableHead>Joueur</TableHead><TableHead className="text-right">Bénéfice net</TableHead><TableHead className="text-right">Réussite</TableHead><TableHead className="text-right">Paris réglés</TableHead></TableRow></TableHeader><TableBody>{leaders.map((leader, index) => <TableRow key={leader.user_id}><TableCell className="font-black">{index + 1}</TableCell><TableCell><div className="flex items-center gap-3"><AvatarView profile={leader} /><span className="font-bold">{leader.username}</span></div></TableCell><TableCell className={cn("text-right font-black", leader.net_profit >= 0 ? "text-[#16876c]" : "text-[#c7446d]")}>{leader.net_profit >= 0 ? "+" : ""}{squid(leader.net_profit)} S</TableCell><TableCell className="text-right">{leader.success_rate}%</TableCell><TableCell className="text-right">{leader.settled_wagers}</TableCell></TableRow>)}</TableBody></Table>{!leaders.length && <p className="p-10 text-center text-muted-foreground">Le classement démarrera après les premiers paris.</p>}</div><p className="mt-4 text-sm text-muted-foreground">Seuls les paris terminés comptent. Les dotations initiales et remboursements ne sont pas des gains.</p></>;
}

function ProfilePage({ user, profile, wallet, wagers, onSaved }: { user: User; profile: Profile | null; wallet: Wallet | null; wagers: Wager[]; onSaved: () => Promise<void> }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  useEffect(() => { setUsername(profile?.username || ""); setAvatar(profile?.avatar_url || ""); }, [profile]);
  const engaged = wagers.filter((wager) => wager.result === "open").reduce((sum, wager) => sum + Number(wager.amount), 0);
  async function save(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from("profiles").update({ username: username.trim(), avatar_url: avatar.trim() || null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (error) toast.error(message(error)); else { toast.success("Profil mis à jour."); await onSaved(); }
  }
  return <><PageHeading eyebrow="Compte personnel" title="Mon profil" /><div className="grid gap-6 xl:grid-cols-[1fr_380px]"><Card><CardContent className="p-6 sm:p-8"><div className="flex items-center gap-4"><AvatarView profile={profile || undefined} className="size-20" /><div><p className="text-xl font-black">{profile?.username}</p><p className="text-sm text-muted-foreground">{user.email}</p><Badge variant="secondary" className="mt-2">E-mail vérifié</Badge></div></div><form onSubmit={save} className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="profile-name">Pseudo</Label><Input id="profile-name" required minLength={2} maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="profile-avatar">URL de l’avatar (facultatif)</Label><Input id="profile-avatar" type="url" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></div><Button className="bg-[#142846]">Enregistrer</Button></form></CardContent></Card><div className="space-y-4"><div className="rounded-2xl bg-[#142846] p-6 text-white"><WalletCards className="size-6 text-[#ed6f96]" /><p className="mt-5 text-sm text-white/60">Solde disponible</p><p className="text-4xl font-black">{squid(wallet?.balance || 0)}</p><p className="text-sm text-white/60">Squids</p></div><div className="rounded-2xl border bg-white p-6"><p className="text-sm text-muted-foreground">Squids engagés</p><p className="mt-1 text-3xl font-black">{squid(engaged)}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Ils restent engagés jusqu’au règlement ou au remboursement du sujet.</p></div></div></div></>;
}

function AdminPage({ markets, reports, members, currentUserId, onChanged }: { markets: Market[]; reports: Report[]; members: MemberRow[]; currentUserId: string; onChanged: () => Promise<void> }) {
  const [settling, setSettling] = useState<Market | null>(null);
  const [outcome, setOutcome] = useState<"yes" | "no" | "cancelled" | "close">("yes");
  const [busy, setBusy] = useState(false);
  const adminLock = useRef(false);
  const [note, setNote] = useState("");
  async function settle() {
    if (!settling || adminLock.current) return;
    adminLock.current = true; setBusy(true);
    const { error } = outcome === "close" ? await supabase.rpc("close_subject", { p_subject_id: settling.id, p_note: note }) : await supabase.rpc("resolve_subject", { p_subject_id: settling.id, p_outcome: outcome, p_note: note });
    if (error) toast.error(message(error)); else { toast.success(outcome === "close" ? "Mises clôturées. Le résultat pourra être saisi plus tard." : "Sujet réglé. Les portefeuilles ont été mis à jour."); setSettling(null); setNote(""); await onChanged(); }
    adminLock.current = false; setBusy(false);
  }
  async function toggleMember(member: MemberRow) {
    const status = member.status === "active" ? "suspended" : "active";
    const { error } = await supabase.rpc("set_member_status", { p_user_id: member.user_id, p_status: status });
    if (error) toast.error(message(error)); else { toast.success(status === "active" ? "Compte réactivé." : "Compte suspendu."); await onChanged(); }
  }
  async function closeReport(report: Report, status: "resolved" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status, resolved_by: currentUserId, resolved_at: new Date().toISOString() }).eq("id", report.id);
    if (error) toast.error(message(error)); else await onChanged();
  }
  return <><PageHeading eyebrow="Administration" title="Piloter la classe" /><div>
    <div className="space-y-4"><h2 className="text-xl font-black">Sujets à régler</h2>{markets.filter((m) => m.status === "open").map((market) => <div key={market.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-bold">{market.title}</p><p className="mt-1 text-sm text-muted-foreground">Clôture : {compactDate.format(new Date(market.closes_at))} · Cagnotte : {squid(market.total_pool)} S</p></div><Button variant="outline" onClick={() => setSettling(market)}>Régler</Button></div>)}</div>
    <section className="mt-10 overflow-hidden rounded-2xl border bg-white"><div className="p-6"><h2 className="text-xl font-black">Membres</h2></div><Table><TableHeader><TableRow><TableHead>Membre</TableHead><TableHead>Rôle</TableHead><TableHead>Solde</TableHead><TableHead className="text-right">Accès</TableHead></TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.user_id}><TableCell><div className="flex items-center gap-3"><AvatarView profile={member.profile} /><span className="font-bold">{member.profile?.username || member.user_id.slice(0, 8)}</span></div></TableCell><TableCell>{member.role === "admin" ? "Admin" : "Joueur"}</TableCell><TableCell>{squid(member.wallet?.balance || 0)} S</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" disabled={member.user_id === currentUserId} onClick={() => void toggleMember(member)}>{member.status === "active" ? "Suspendre" : "Réactiver"}</Button></TableCell></TableRow>)}</TableBody></Table></section>
    <section className="mt-10 space-y-3"><h2 className="text-xl font-black">Signalements</h2>{reports.filter((r) => r.status === "open").map((report) => <div key={report.id} className="rounded-2xl border bg-white p-5"><p className="font-bold">{markets.find((market) => market.id === report.subject_id)?.title || "Sujet signalé"}</p><p className="mt-2 text-sm leading-relaxed">{report.reason}</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={() => void closeReport(report, "resolved")}>Traité</Button><Button size="sm" variant="outline" onClick={() => void closeReport(report, "dismissed")}>Classer sans suite</Button></div></div>)}{!reports.some((r) => r.status === "open") && <p className="rounded-xl border border-dashed bg-white p-6 text-center text-muted-foreground">Aucun signalement en attente.</p>}</section>
  </div>
  <Dialog open={Boolean(settling)} onOpenChange={(open) => !open && setSettling(null)}><DialogContent><DialogHeader><DialogTitle>Régler le sujet</DialogTitle><DialogDescription>{settling?.title}</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-2">{(["yes","no","cancelled","close"] as const).map((value) => <button key={value} onClick={() => setOutcome(value)} className={cn("rounded-xl border-2 p-3 font-bold", outcome === value ? "border-[#142846] bg-[#edf1f7]" : "border-border")}>{value === "yes" ? "Oui" : value === "no" ? "Non" : value === "cancelled" ? "Annuler" : "Clôturer"}</button>)}</div><Textarea value={note} onChange={(e) => setNote(e.target.value)} minLength={10} maxLength={2000} aria-label="Justification de la décision" placeholder="Justification précise du résultat…" /></div><DialogFooter><Button variant="outline" onClick={() => setSettling(null)}>Fermer</Button><Button disabled={busy || note.trim().length < 10} onClick={() => void settle()}>{busy ? "Traitement…" : outcome === "close" ? "Clôturer les mises" : "Confirmer et payer"}</Button></DialogFooter></DialogContent></Dialog></>;
}
