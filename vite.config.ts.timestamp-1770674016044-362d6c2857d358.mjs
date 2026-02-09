// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const defaultSupabaseUrl = "https://nexahtdtctnhylfjatix.supabase.co";
  const defaultSupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5leGFodGR0Y3RuaHlsZmphdGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzE3MzMsImV4cCI6MjA4NDI0NzczM30.5e8IqSZD06Z5f5ZAb2-iEHC9CHGXIDq0jVt5VcEJ4wc";
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.SUPABASE_URL || defaultSupabaseUrl;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || defaultSupabaseAnonKey;
  return {
    // Force-inject the exact env names used by the auto-generated client.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey)
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "TaskFlow - Project Management",
          short_name: "TaskFlow",
          description: "Project and task management with Kanban boards, time tracking, and team analytics",
          theme_color: "#6366f1",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/nexahtdtctnhylfjatix\.supabase\.co\/rest\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 5
                },
                networkTimeoutSeconds: 10
              }
            },
            {
              urlPattern: /^https:\/\/nexahtdtctnhylfjatix\.supabase\.co\/auth\/.*/i,
              handler: "NetworkOnly"
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            }
          ]
        }
      }),
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIEVuc3VyZSBvdXIgZnJvbnRlbmQgZW52IHZhcnMgYXJlIGFsd2F5cyBhdmFpbGFibGUsIGV2ZW4gaWYgdGhlIHBsYXRmb3JtIG9ubHlcbiAgLy8gaW5qZWN0cyBub24tVklURV8gZXF1aXZhbGVudHMgYXQgYnVpbGQgdGltZS5cbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlwiKTtcblxuICAvLyBGYWxsYmFja3MgKHB1YmxpYyB2YWx1ZXMpIHRvIGF2b2lkIGEgYmxhbmsgc2NyZWVuIGlmIGVudiBpbmplY3Rpb24gaXMgbWlzc2luZy5cbiAgY29uc3QgZGVmYXVsdFN1cGFiYXNlVXJsID0gXCJodHRwczovL25leGFodGR0Y3RuaHlsZmphdGl4LnN1cGFiYXNlLmNvXCI7XG4gIGNvbnN0IGRlZmF1bHRTdXBhYmFzZUFub25LZXkgPVxuICAgIFwiZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW01bGVHRm9kR1IwWTNSdWFIbHNabXBoZEdsNElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTmpnMk56RTNNek1zSW1WNGNDSTZNakE0TkRJME56Y3pNMzAuNWU4SXFTWkQwNlo1ZjVaQWIyLWlFSEM5Q0hHWElEcTBqVnQ1VmNFSjR3Y1wiO1xuXG4gIGNvbnN0IHN1cGFiYXNlVXJsID1cbiAgICBlbnYuVklURV9TVVBBQkFTRV9VUkwgfHxcbiAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fFxuICAgIGVudi5TVVBBQkFTRV9VUkwgfHxcbiAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9VUkwgfHxcbiAgICBkZWZhdWx0U3VwYWJhc2VVcmw7XG5cbiAgY29uc3Qgc3VwYWJhc2VBbm9uS2V5ID1cbiAgICBlbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSB8fFxuICAgIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVkgfHxcbiAgICBlbnYuU1VQQUJBU0VfQU5PTl9LRVkgfHxcbiAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9BTk9OX0tFWSB8fFxuICAgIGRlZmF1bHRTdXBhYmFzZUFub25LZXk7XG5cbiAgcmV0dXJuIHtcbiAgICAvLyBGb3JjZS1pbmplY3QgdGhlIGV4YWN0IGVudiBuYW1lcyB1c2VkIGJ5IHRoZSBhdXRvLWdlbmVyYXRlZCBjbGllbnQuXG4gICAgZGVmaW5lOiB7XG4gICAgICBcImltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1VSTFwiOiBKU09OLnN0cmluZ2lmeShzdXBhYmFzZVVybCksXG4gICAgICBcImltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZXCI6IEpTT04uc3RyaW5naWZ5KHN1cGFiYXNlQW5vbktleSksXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGhvc3Q6IFwiOjpcIixcbiAgICAgIHBvcnQ6IDgwODAsXG4gICAgICBobXI6IHtcbiAgICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSxcbiAgICAgIFZpdGVQV0Eoe1xuICAgICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxuICAgICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIGluY2x1ZGVBc3NldHM6IFtcImZhdmljb24uaWNvXCIsIFwiYXBwbGUtdG91Y2gtaWNvbi5wbmdcIiwgXCJwd2EtMTkyeDE5Mi5wbmdcIiwgXCJwd2EtNTEyeDUxMi5wbmdcIl0sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgbmFtZTogXCJUYXNrRmxvdyAtIFByb2plY3QgTWFuYWdlbWVudFwiLFxuICAgICAgICAgIHNob3J0X25hbWU6IFwiVGFza0Zsb3dcIixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJQcm9qZWN0IGFuZCB0YXNrIG1hbmFnZW1lbnQgd2l0aCBLYW5iYW4gYm9hcmRzLCB0aW1lIHRyYWNraW5nLCBhbmQgdGVhbSBhbmFseXRpY3NcIixcbiAgICAgICAgICB0aGVtZV9jb2xvcjogXCIjNjM2NmYxXCIsXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZmZmZmZmXCIsXG4gICAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXG4gICAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcbiAgICAgICAgICBzY29wZTogXCIvXCIsXG4gICAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcbiAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzcmM6IFwicHdhLTE5MngxOTIucG5nXCIsXG4gICAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogXCJwd2EtNTEyeDUxMi5wbmdcIixcbiAgICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxuICAgICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiBcInB3YS01MTJ4NTEyLnBuZ1wiLFxuICAgICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXG4gICAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICAgIHB1cnBvc2U6IFwibWFza2FibGVcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgd29ya2JveDoge1xuICAgICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxuICAgICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXG4gICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMix3b2ZmLHR0Zn1cIl0sXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogXCJpbmRleC5odG1sXCIsXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9hcGkvXSxcbiAgICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL25leGFodGR0Y3RuaHlsZmphdGl4XFwuc3VwYWJhc2VcXC5jb1xcL3Jlc3RcXC8uKi9pLFxuICAgICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcInN1cGFiYXNlLWFwaS1jYWNoZVwiLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL25leGFodGR0Y3RuaHlsZmphdGl4XFwuc3VwYWJhc2VcXC5jb1xcL2F1dGhcXC8uKi9pLFxuICAgICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuKGdvb2dsZWFwaXN8Z3N0YXRpYylcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJnb29nbGUtZm9udHMtY2FjaGVcIixcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAyMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG59KTtcblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLGNBQWMsZUFBZTtBQUMvUCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLFNBQVMsZUFBZTtBQUp4QixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUd4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFHM0MsUUFBTSxxQkFBcUI7QUFDM0IsUUFBTSx5QkFDSjtBQUVGLFFBQU0sY0FDSixJQUFJLHFCQUNKLFFBQVEsSUFBSSxxQkFDWixJQUFJLGdCQUNKLFFBQVEsSUFBSSxnQkFDWjtBQUVGLFFBQU0sa0JBQ0osSUFBSSwwQkFDSixRQUFRLElBQUksMEJBQ1osSUFBSSxxQkFDSixRQUFRLElBQUkscUJBQ1o7QUFFRixTQUFPO0FBQUE7QUFBQSxJQUVMLFFBQVE7QUFBQSxNQUNOLHFDQUFxQyxLQUFLLFVBQVUsV0FBVztBQUFBLE1BQy9ELDBDQUEwQyxLQUFLLFVBQVUsZUFBZTtBQUFBLElBQzFFO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixLQUFLO0FBQUEsUUFDSCxTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxRQUNkLFlBQVk7QUFBQSxVQUNWLFNBQVM7QUFBQSxRQUNYO0FBQUEsUUFDQSxlQUFlLENBQUMsZUFBZSx3QkFBd0IsbUJBQW1CLGlCQUFpQjtBQUFBLFFBQzNGLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLGtCQUFrQjtBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULGFBQWE7QUFBQSxVQUNiLE9BQU87QUFBQSxVQUNQLFdBQVc7QUFBQSxVQUNYLE9BQU87QUFBQSxZQUNMO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsWUFDUjtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxZQUNSO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsU0FBUztBQUFBLFVBQ1AsYUFBYTtBQUFBLFVBQ2IsY0FBYztBQUFBLFVBQ2QsdUJBQXVCO0FBQUEsVUFDdkIsY0FBYyxDQUFDLCtDQUErQztBQUFBLFVBQzlELGtCQUFrQjtBQUFBLFVBQ2xCLDBCQUEwQixDQUFDLFFBQVE7QUFBQSxVQUNuQyxnQkFBZ0I7QUFBQSxZQUNkO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLO0FBQUEsZ0JBQ3RCO0FBQUEsZ0JBQ0EsdUJBQXVCO0FBQUEsY0FDekI7QUFBQSxZQUNGO0FBQUEsWUFDQTtBQUFBLGNBQ0UsWUFBWTtBQUFBLGNBQ1osU0FBUztBQUFBLFlBQ1g7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLLEtBQUssS0FBSztBQUFBLGdCQUNoQztBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELFNBQVMsaUJBQWlCLGdCQUFnQjtBQUFBLElBQzVDLEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFDaEIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
