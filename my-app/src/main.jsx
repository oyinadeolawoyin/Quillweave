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
import Services from './components/services/services';
import Blog from './components/blog/blog';
import BlogPost from './components/blog/blogPost';
import AdminBlog from './components/blog/adminBlog';
import AdminQuote from './components/quote/adminquote';
import App from './App'
import SnippetFeed from './components/sprint/snippetfeed';
import SnippetPage from './components/sprint/snippetpage';
import AdminSchedule from './components/sprint/adminschedule';
import AdminSoundscapes from './components/sprint/Adminsoundscapes';
import Settings from './components/profile/settings';
import ProjectsPage from './components/projects/projectspage';
import CreateEditProject from './components/projects/createeditproject';
import ProjectStats from './components/projects/projectstats';
import FeedbackHub from './components/feedbackHub/feedbackhub';
import SubmitFeedback from './components/feedbackHub/submitFeedback';
import FeedbackPage from './components/feedbackHub/feedbackPage';
import OutdatedPage from './components/feedbackHub/outdatedpage';
import DiscoveryFeed from './components/discovery/discoveryfeed';
import DiscoveryStoryPage from './components/discovery/discoverystorypage';
import SubmitDiscoveryStory from './components/discovery/submitdiscoverystory';
import AdminDiscovery from './components/discovery/admindiscovery';

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
  // {
  //   path: "/services",
  //   element: <Services />
  // },
  {
    path: "/blog",
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
    path: "/admin/quote",
    element: <AdminQuote />
  },
  { 
    path: "/admin/schedule", 
    element: <AdminSchedule /> 
  },
  {
    path: "/admin/soundscapes",
    element: <AdminSoundscapes />
  },
  { 
    path: "/projects",             
    element: <ProjectsPage /> 
  },
  { 
    path: "/projects/create",      
    element: <CreateEditProject /> 
  },
  { 
    path: "/projects/:projectId",  
    element: <ProjectStats /> 
  },
  { 
    path: "/projects/:projectId/edit", 
    element: <CreateEditProject /> 
  },
  { 
    path: "/feedback", 
    element: <FeedbackHub /> 
  },
  { 
    path: "/feedback/submit", 
    element: <SubmitFeedback /> 
  },
  { 
    path: "/feedback/:id/edit",     
    element: <SubmitFeedback /> 
  },
  { 
    path: "/feedback/:id",     
    element: <FeedbackPage /> 
  },
  {
    path: "/feedback/outdated",
    element: <OutdatedPage />
  },
  { 
    path: "/profile/:userId",     
    element: <UserFeedbackSubmissions /> 
  },
  { 
    path: "/discovery", 
    element: <DiscoveryFeed /> 
  },
  { 
    path: "/discovery/submit", 
    element: <SubmitDiscoveryStory /> 
  },
  { 
    path: "/discovery/:storyId/edit", 
    element: <SubmitDiscoveryStory /> 
  },
  { 
    path: "/discovery/:storyId", 
    element: <DiscoveryStoryPage /> 
  },
  { 
    path: "/admin/discovery", 
    element: <AdminDiscovery /> 
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