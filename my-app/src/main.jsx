import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'

import { AuthProvider } from './components/auth/authContext'

import Signup from './components/auth/signup';
import Login from './components/auth/login';
import ForgotPassword from './components/auth/forgotPassword';
import ResetPassword from './components/auth/resetPassword';

import GroupSprintWorkspace from './components/sprint/groupSprintWorkspace';

import Notification from './components/notification/notification';
// import UserFeedbackSubmissions from './components/profile/profile';
import NotFound from './components/NotFound';
import Homepage from './components/about/about';

import Blog from './components/blog/blog';
import BlogPost from './components/blog/blogPost';
import BlogSeries from './components/blog/blogSeries';
import AdminBlog from './components/blog/adminBlog';

import Layout from './components/dashboard/layout';
import MembersPage from './components/leaderBoard/memberspage';

import AdminSoundscapes from './components/sprint/Adminsoundscapes';
import SprintRoom from './components/sprint/sprintroom';

import Settings from './components/profile/settings';
import ProfilePage from './components/profile/profilepage';

import FeedbackHub from './components/feedbackHub/feedbackhub';
import SubmitFeedback from './components/feedbackHub/submitFeedback';
import FeedbackPage from './components/feedbackHub/feedbackPage';
import ArchivePage from './components/feedbackHub/archivePage';
import AdminReportsPage from './components/feedbackHub/adminreportspage';
import QueuePage from './components/feedbackHub/queuePage';
import MySubmissions from './components/feedbackHub/mysubmissions';

import DraftsPage from './components/drafts/draftspage';
import WritePage from './components/drafts/writePage';

import DraftPlanPage from './components/draftPlan/draftPlanPage';
import DaysChallengePage from './components/daysChallenge/dayschallengepage';
import DraftPlanNewPage from './components/draftPlan/draftplannewpage';
import DaysChallengeNewPage from './components/daysChallenge/dayschallengenewpage';

import ThreadPage from './components/threads/threadpage';
import ForumPage from './components/threads/forumpage';
import CategoryPage from './components/threads/categorypage';
import ThreadFormPage from './components/threads/threadformpage';
import AdminThreadsPage from './components/threads/adminthreadspage';

import InboxPage from './components/message/inboxpage';
import ConversationPage from './components/message/conversationpage';

import EventsPage from './components/event/eventspage';
import AdminEvents from './components/event/adminevents';

import MiniChallengePage from './components/minichallenge/minichallengepage';
import AdminMiniChallenges from './components/minichallenge/adminminichallenges';

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}


const router = createBrowserRouter([
  // ── Standalone (no sidebar) ── pages a person can hit before/without auth
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },

  // ── Everything else shares the sidebar layout ──────────────────────────
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Homepage />
      },
      {
        path: "settings",
        element: <Settings />
      },
      {
        path: "group-sprint/:groupSprintId",
        element: <GroupSprintWorkspace />
      },
      {
        path: "notifications",
        element: <Notification />
      },
      {
        path: "community-update",
        element: <Blog />
      },
      {
        path: "blog/:postId",
        element: <BlogPost />
      },
      {
        path: "admin/blog",
        element: <AdminBlog />
      },
      {
        path: "blog/series/:slug",
        element: <BlogSeries />
      },
      {
        path: "admin/soundscapes",
        element: <AdminSoundscapes />
      },
      {
        path: "sprint-room",
        element: <SprintRoom />
      },
      {
        path: "members",
        element: <MembersPage />
      },
      {
        path: "forum",
        element: <ForumPage />
      },
      {
        path: "threads/:threadId",
        element: <ThreadPage />
      },
      {
        path: "threads/submit",
        element: <ThreadFormPage />
      },
      {
        path: "threads/:threadId/edit",
        element: <ThreadFormPage />
      },
      {
        path: "/forum/category/:categoryId",
        element: <CategoryPage />
      },
      {
        path: "admin/threads",
        element: <AdminThreadsPage />
      },
      {
        path: "critique",
        element: <FeedbackHub />
      },
      {
        path: "critique/submit",
        element: <SubmitFeedback />
      },
      {
        path: "critique/:id/edit",
        element: <SubmitFeedback />
      },
      {
        path: "critique/:id",
        element: <FeedbackPage />
      },
      {
        path: "critique/archive",
        element: <ArchivePage />
      },
      {
        path: "critique/queue",
        element: <QueuePage />
      },
      {
        path: "submissions",
        element: <MySubmissions />
      },
      {
        path: "admin/reports",
        element: <AdminReportsPage />
      },
      {
        path: "profile/:userId",
        element: <ProfilePage />
      },
      {
        path: "drafts",
        element: <DraftsPage />
      },
      {
        path: "write",
        element: <WritePage />
      },
      {
        path: "write/:draftId",
        element: <WritePage />
      },
      {
        path: "draftplan",
        element: <DraftPlanPage />
      },
      {
        path: "/draftplan/new",
        element: <DraftPlanNewPage />
      },
      {
        path: "/days-challenge/new",
        element: <DaysChallengeNewPage />
      },
      {
        path: "days-challenge",
        element: <DaysChallengePage />
      },
      {
        path: "/admin/events",
        element: <AdminEvents />
      },
      {
        path: "/events",
        element: <EventsPage />
      },
      {
        path: "/mini-challenges",
        element: <MiniChallengePage />
      },
      {
        path: "/admin/mini-challenges",
        element: <AdminMiniChallenges />
      },
      {
        path: "messages",
        element: <InboxPage />
      },
      {
        path: "messages/:conversationId",
        element: <ConversationPage />
      },
      {
        path: "*",
        element: <NotFound />
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)