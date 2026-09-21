import { supabase, isSupabaseConfigured } from './src/lib/supabase.js';
    window.supabaseClient = supabase;

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          window.location.href = 'auth.html';
        } else {
          document.body.style.opacity = '1';
          window.currentUserId = session.user.id;
          const name = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
          localStorage.setItem('isamarket_current_user', name);
          if (window.loadUserState) window.loadUserState();
          if (window.loadLeaderboardData) window.loadLeaderboardData();
          if (window.renderStandings) window.renderStandings();
        }
      });
      
      window.supabaseLogOut = async function() {
        await supabase.auth.signOut();
        window.location.href = 'auth.html';
      };
    } else {
      window.supabaseLogOut = function() {
        alert("Sign out clicked (Supabase not configured)");
      }
    }