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
import UserFeedbackSubmissions from './components/profile/profile';
import NotFound from './components/NotFound';
import About from './components/about/about';
import Blog from './components/blog/blog';
import BlogPost from './components/blog/blogPost';
import BlogSeries from './components/blog/blogSeries';
import AdminBlog from './components/blog/adminBlog';
import EmotionPracticePage from './components/emotioncues/emotionpracticepage';
import ThesaurusPage from './components/emotioncues/ThesaurusPage';
import App from './App'
import MembersPage from './components/leaderBoard/memberspage';
import AccountabilityPage from './components/sprint/accountabilitypage';
import SnippetFeed from './components/sprint/snippetfeed';
import SnippetPage from './components/sprint/snippetpage';
import AdminSoundscapes from './components/sprint/Adminsoundscapes';
import Settings from './components/profile/settings';
import FeedbackHub from './components/feedbackHub/feedbackhub';
import SubmitFeedback from './components/feedbackHub/submitFeedback';
import FeedbackPage from './components/feedbackHub/feedbackPage';
import ArchivePage from './components/feedbackHub/archivePage';
import AdminReportsPage from './components/feedbackHub/adminreportspage';
import QueuePage from './components/feedbackHub/queuePage';
import DiscoveryFeed from './components/discovery/discoveryfeed';
import DiscoveryStoryPage from './components/discovery/discoverystorypage';
import SubmitDiscoveryStory from './components/discovery/submitdiscoverystory';
import AdminDiscovery from './components/discovery/admindiscovery';
import DraftsPage from './components/drafts/draftspage';
import WritePage from './components/drafts/writePage';
import ChallengePage from './components/challenge/challengepage';
import ThreadPage from './components/threads/threadpage';
import ForumPage from './components/threads/forumpage';
import ThreadFormPage from './components/threads/threadformpage';
import AdminThreadsPage from './components/threads/adminthreadspage';

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/settings",
    element: <Settings />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },
  {
    path: "/snippets",
    element: <SnippetFeed />
  },
  {
    path: "/snippets/:snippetId",
    element: <SnippetPage />
  },
  {
    path: "group-sprint/:groupSprintId",
    element: <GroupSprintWorkspace />
  },
  {
    path: "/notifications",
    element: <Notification />
  },
  {
    path: "/about",
    element: <About />
  },
  {
    path: "/thesaurus",
    element: <ThesaurusPage />
  },
  {
    path: "/communityNews",
    element: <Blog />
  },
  {
    path: "/blog/:postId",
    element: <BlogPost />
  },
  {
    path: "/admin/blog",
    element: <AdminBlog />
  },
  {
    path: "/blog/series/:slug",
    element: <BlogSeries />
  },
  {
    path: "/emotion-practice",
    element: <EmotionPracticePage />
  },
  {
    path: "/admin/soundscapes",
    element: <AdminSoundscapes />
  },
  {
    path: "/members",
    element: <MembersPage />
  },
  {
    path: "/accountability",
    element: <AccountabilityPage />
  },
  {
    path: "/challenge",
    element: <ChallengePage />
  },
  {
    path: "/forum",
    element: <ForumPage />
  },
  {
    path: "/threads/:threadId",
    element: <ThreadPage />
  },
  {
    path: "/threads/submit",
    element: <ThreadFormPage />
  },
  {
    path: "/threads/:threadId/edit",
    element: <ThreadFormPage />
  },
  {
    path: "/admin/threads",
    element: <AdminThreadsPage />
  },
  { 
    path: "/critique", 
    element: <FeedbackHub /> 
  },
  { 
    path: "/critique/submit", 
    element: <SubmitFeedback /> 
  },
  { 
    path: "/critique/:id/edit",     
    element: <SubmitFeedback /> 
  },
  { 
    path: "/critique/:id",     
    element: <FeedbackPage /> 
  },
  {
    path: "/critique/archive",
    element: <ArchivePage />
  },
  {
    path: "/critique/queue",
    element: <QueuePage />
  },
  {
    path: "/admin/reports",
    element: <AdminReportsPage />
  },
  { 
    path: "/profile/:userId",     
    element: <UserFeedbackSubmissions /> 
  },
  { 
    path: "/stories", 
    element: <DiscoveryFeed /> 
  },
  { 
    path: "/stories/submit", 
    element: <SubmitDiscoveryStory /> 
  },
  { 
    path: "/discovery/:storyId/edit", 
    element: <SubmitDiscoveryStory /> 
  },
  { 
    path: "/stories/:storyId", 
    element: <DiscoveryStoryPage /> 
  },
  { 
    path: "/admin/stories", 
    element: <AdminDiscovery /> 
  },
  { 
    path: "/drafts", 
    element: <DraftsPage /> 
  },
  { 
    path: "/write",          
    element: <WritePage />
  },
  { 
    path: "/write/:draftId",          
    element: <WritePage />
  },
  {
    path: "*",
    element: <NotFound />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)