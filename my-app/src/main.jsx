import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'

import { AuthProvider } from './components/auth/authContext'

import Signup from './components/auth/signup';
import Login from './components/auth/login';
import ForgotPassword from './components/auth/forgotPassword';
import ResetPassword from './components/auth/resetPassword';
import Welcome from './components/auth/welcome';

import SetupPlan from './components/writingPlan/setupPlan';
import Dashboard from './components/dashboard/dashboard';

import ActiveSprint from './components/sprint/workspace';
import StartSprint from './components/sprint/startSprint';
import GroupSprintWorkspace from './components/sprint/groupSprintWorkspace';

import Notification from './components/notification/notification';
import Profile from './components/profile/profile';
// import EditProfile from './components/profile/editProfile';
import NotFound from './components/NotFound';
import About from './components/about/about';
import Missions from './components/missions/missions';
import Services from './components/services/services';
import Blog from './components/blog/blog';
import BlogPost from './components/blog/blogPost';
import AdminBlog from './components/blog/adminBlog';
import App from './App'

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
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },
  {
    path: "/welcome",
    element: <Welcome />
  },
  {
    path: "/setup-plan",
    element: <SetupPlan />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/profile/:userId",
    element: <Profile />,
    // children: [
     
    // ]
  },
  // {
  //   path: "/profile/edit",
  //   element: <EditProfile />
  // },
  {
    path: "/sprint/:sprintId",
    element: <ActiveSprint />,
  },
  {
    path: "/start-sprint",
    element: <StartSprint />
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
    path: "/missions",
    element: <Missions />
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
