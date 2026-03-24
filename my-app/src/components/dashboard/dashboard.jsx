// import { useState, useEffect } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import { useAuth } from "../auth/authContext";
// import Header from "../profile/header";
// import DailyQuote from "../quote/dailyQuote";
// import { AppMetaTags } from "../utilis/metatags";
// import WritingHeatmap from "../missions/WritingHeatmap";
// import API_URL from "@/config/api";

// // ── Recent sprints list ───────────────────────────────────────────────────────
// function RecentSprints({ userId }) {
//   const [sprints,   setSprints]   = useState([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (!userId) { setIsLoading(false); return; }
//     fetch(`${API_URL}/sprint/${userId}/recent`, { credentials: "include" })
//       .then((r) => r.ok ? r.json() : null)
//       .then((d) => { if (d) setSprints(d.sprints || []); })
//       .catch(console.error)
//       .finally(() => setIsLoading(false));
//   }, [userId]);

//   if (isLoading) {
//     return (
//       <div className="bg-white rounded-2xl shadow-soft p-6 space-y-3">
//         <div className="h-5 w-36 bg-gray-100 rounded-lg animate-pulse mb-4" />
//         {[1, 2, 3].map((i) => (
//           <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
//         ))}
//       </div>
//     );
//   }

//   if (sprints.length === 0) return null;

//   return (
//     <div className="bg-white rounded-2xl shadow-soft p-6">
//       <h3 className="text-xl font-serif text-ink-primary mb-4">Recent Sprints</h3>
//       <div className="space-y-3">
//         {sprints.map((sprint) => (
//           <div
//             key={sprint.id}
//             className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
//           >
//             {/* Stats */}
//             <div className="flex gap-4 flex-shrink-0">
//               <div className="text-center">
//                 <div className="text-xl font-bold text-ink-primary">
//                   {(sprint.wordsWritten || 0).toLocaleString()}
//                 </div>
//                 <div className="text-[10px] text-gray-400 uppercase tracking-wide">words</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-xl font-bold text-ink-primary">{sprint.duration}</div>
//                 <div className="text-[10px] text-gray-400 uppercase tracking-wide">min</div>
//               </div>
//             </div>

//             {/* Quote + date */}
//             <div className="flex-1 min-w-0">
//               {sprint.checkin && (
//                 <p className="text-sm text-gray-600 italic truncate">"{sprint.checkin}"</p>
//               )}
//               <p className="text-xs text-gray-400 mt-0.5">
//                 {sprint.completedAt
//                   ? new Date(sprint.completedAt).toLocaleDateString("en-US", {
//                       month: "short",
//                       day: "numeric",
//                       year: "numeric",
//                     })
//                   : ""}
//               </p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }


// // ── Dashboard page ────────────────────────────────────────────────────────────
// export default function Dashboard() {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [showGroupModal, setShowGroupModal] = useState(false);

//   function handleGroupSprintCreated(groupSprint) {
//     navigate(`/group-sprint/${groupSprint.id}`);
//   }

//   return (
//     <div className="min-h-screen bg-ink-cream">
//       <Header />
//       <AppMetaTags
//         title="My Writing Space"
//         description="Showing up, one sprint at a time."
//       />

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

//           {/* Left Column */}
//           <div className="lg:col-span-2 space-y-6 lg:space-y-8">
//             <DailyQuote />

//             {/* Sprint CTA */}
//             <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
//               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
//                 <div className="text-center sm:text-left">
//                   <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-2">
//                     Ready to write?
//                   </h2>
//                   <p className="text-sm sm:text-base text-ink-gray">
//                     Even 10 minutes counts. Let's get started.
//                   </p>
//                 </div>

//                 <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
//                   <button
//                     onClick={() => navigate("/start-sprint")}
//                     className="w-full sm:w-auto px-6 py-3 bg-ink-primary text-white text-base font-medium rounded-xl
//                              hover:bg-opacity-90 transition-all shadow-soft
//                              focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
//                   >
//                     Solo Sprint
//                   </button>
//                   <button
//                     onClick={() => setShowGroupModal(true)}
//                     className="w-full sm:w-auto px-6 py-3 border-2 border-ink-primary text-ink-primary text-base font-medium rounded-xl
//                              hover:bg-ink-primary hover:text-white transition-all
//                              focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
//                   >
//                     Group Sprint
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Existing progress stats (kept exactly as-is) */}
//             <ProgressStats />

//             {/* XP, rank & rank ladder */}
//             {user && <WriterXPCard userId={user.id} />}

//             {/* Writing Heatmap */}
//             {user && <WritingHeatmap userId={user.id} />}

//             {/* Recent Sprints */}
//             {user && <RecentSprints userId={user.id} />}
//           </div>

//           {/* Right Column */}
//           <div className="space-y-6 lg:space-y-8">
//             <WritingSchedule />
//           </div>
//         </div>
//       </main>

//       <StartGroupSprintModal
//         isOpen={showGroupModal}
//         onClose={() => setShowGroupModal(false)}
//         onCreated={handleGroupSprintCreated}
//       />
//     </div>
//   );
// }
