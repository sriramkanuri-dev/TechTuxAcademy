import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/routing/Guards';
import { PageLoader } from '@/components/ui/Spinner';

const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const Tutorials = lazy(() => import('@/pages/Tutorials'));
const TutorialDetail = lazy(() => import('@/pages/TutorialDetail'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogDetail = lazy(() => import('@/pages/BlogDetail'));
const Categories = lazy(() => import('@/pages/Categories'));
const CategoryDetail = lazy(() => import('@/pages/CategoryDetail'));
const SearchPage = lazy(() => import('@/pages/Search'));
const Contact = lazy(() => import('@/pages/Contact'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const VerifyCertificate = lazy(() => import('@/pages/VerifyCertificate'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const MyCourses = lazy(() => import('@/pages/dashboard/MyCourses'));
const Learn = lazy(() => import('@/pages/dashboard/Learn'));
const Certificates = lazy(() => import('@/pages/dashboard/Certificates'));
const Profile = lazy(() => import('@/pages/dashboard/Profile'));
const Settings = lazy(() => import('@/pages/dashboard/Settings'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminCourses = lazy(() => import('@/pages/admin/AdminCourses'));
const AdminCourseEditor = lazy(() => import('@/pages/admin/AdminCourseEditor'));
const AdminTutorials = lazy(() => import('@/pages/admin/AdminTutorials'));
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminEnrollments = lazy(() => import('@/pages/admin/AdminEnrollments'));
const AdminCertificates = lazy(() => import('@/pages/admin/AdminCertificates'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminWebsite = lazy(() => import('@/pages/admin/AdminWebsite'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:slug" element={<CourseDetail />} />
          <Route path="tutorials" element={<Tutorials />} />
          <Route path="tutorials/:slug" element={<TutorialDetail />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogDetail />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:slug" element={<CategoryDetail />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="verify-certificate" element={<VerifyCertificate />} />
          <Route path="verify-certificate/:certificateId" element={<VerifyCertificate />} />
          <Route
            path="login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="learn/:slug"
          element={
            <ProtectedRoute>
              <Learn />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/new" element={<AdminCourseEditor />} />
          <Route path="courses/:id" element={<AdminCourseEditor />} />
          <Route path="tutorials" element={<AdminTutorials />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="enrollments" element={<AdminEnrollments />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="website" element={<AdminWebsite />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
