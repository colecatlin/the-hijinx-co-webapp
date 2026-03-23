import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PlatformDataMap from './pages/PlatformDataMap';
import EditorialHub from './pages/EditorialHub';
import StoryRadar from './pages/StoryRadar';
import EditorialRecommendations from './pages/EditorialRecommendations';
import EditorialSignals from './pages/EditorialSignals';
import EditorialTrendClusters from './pages/EditorialTrendClusters';
import EditorialCoverageMap from './pages/EditorialCoverageMap';
import EditorialReviewQueue from './pages/EditorialReviewQueue';
import EditorialNarratives from './pages/EditorialNarratives';
import EditorialResearchPackets from './pages/EditorialResearchPackets';
import WriterWorkspace from './pages/WriterWorkspace';
import ManageMediaApplications from './pages/ManageMediaApplications';
import ManageAssignments from './pages/ManageAssignments';
import ManageRequests from './pages/ManageRequests';
import ManageRevenue from './pages/ManageRevenue';
import MediaHome from './pages/MediaHome';
import CreatorDirectory from './pages/CreatorDirectory';
import CreatorProfile from './pages/CreatorProfile';
import MediaOutletDirectory from './pages/MediaOutletDirectory';
import MediaOutletProfile from './pages/MediaOutletProfile';
import OutletStoryPage from './pages/OutletStoryPage';
import { DriverProfileRouteWrapper } from './pages/DriverProfile';
import ClaimsCenter from './pages/ClaimsCenter';
import ChampImportAdmin from './pages/ChampImportAdmin';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/management/editorial/story-radar" element={<LayoutWrapper currentPageName="management/editorial/story-radar"><StoryRadar /></LayoutWrapper>} />
      <Route path="/management/editorial/recommendations" element={<LayoutWrapper currentPageName="management/editorial/recommendations"><EditorialRecommendations /></LayoutWrapper>} />
      <Route path="/management/editorial/signals" element={<LayoutWrapper currentPageName="management/editorial/signals"><EditorialSignals /></LayoutWrapper>} />
      <Route path="/management/editorial/trend-clusters" element={<LayoutWrapper currentPageName="management/editorial/trend-clusters"><EditorialTrendClusters /></LayoutWrapper>} />
      <Route path="/management/editorial/coverage-map" element={<LayoutWrapper currentPageName="management/editorial/coverage-map"><EditorialCoverageMap /></LayoutWrapper>} />
      <Route path="/management/editorial/review-queue" element={<LayoutWrapper currentPageName="management/editorial/review-queue"><EditorialReviewQueue /></LayoutWrapper>} />
      <Route path="/management/editorial/narratives" element={<LayoutWrapper currentPageName="management/editorial/narratives"><EditorialNarratives /></LayoutWrapper>} />
      <Route path="/management/editorial/research-packets" element={<LayoutWrapper currentPageName="management/editorial/research-packets"><EditorialResearchPackets /></LayoutWrapper>} />
      <Route path="/management/editorial/writer-workspace" element={<LayoutWrapper currentPageName="management/editorial/writer-workspace"><WriterWorkspace /></LayoutWrapper>} />
      <Route path="/management/media/applications" element={<LayoutWrapper currentPageName="management/media/applications"><ManageMediaApplications /></LayoutWrapper>} />
      <Route path="/management/media/assignments" element={<LayoutWrapper currentPageName="management/media/assignments"><ManageAssignments /></LayoutWrapper>} />
      <Route path="/management/media/requests" element={<LayoutWrapper currentPageName="management/media/requests"><ManageRequests /></LayoutWrapper>} />
      <Route path="/management/media/revenue" element={<LayoutWrapper currentPageName="management/media/revenue"><ManageRevenue /></LayoutWrapper>} />
      <Route path="/MediaHome" element={<LayoutWrapper currentPageName="MediaHome"><MediaHome /></LayoutWrapper>} />
      <Route path="/creators" element={<LayoutWrapper currentPageName="creators"><CreatorDirectory /></LayoutWrapper>} />
      <Route path="/creators/:slug" element={<LayoutWrapper currentPageName="creators"><CreatorProfile /></LayoutWrapper>} />
      <Route path="/media-outlets" element={<LayoutWrapper currentPageName="media-outlets"><MediaOutletDirectory /></LayoutWrapper>} />
      <Route path="/media-outlets/:slug" element={<LayoutWrapper currentPageName="media-outlets"><MediaOutletProfile /></LayoutWrapper>} />
      {/* Canonical slug-based story route */}
      <Route path="/story/:slug" element={<LayoutWrapper currentPageName="OutletStoryPage"><OutletStoryPage /></LayoutWrapper>} />
      {/* Canonical slug-based driver profile route */}
      <Route path="/drivers/:slug" element={<LayoutWrapper currentPageName="DriverProfile"><DriverProfileRouteWrapper /></LayoutWrapper>} />
      <Route path="/ClaimsCenter" element={<LayoutWrapper currentPageName="ClaimsCenter"><ClaimsCenter /></LayoutWrapper>} />
      <Route path="/dashboard/claims" element={<LayoutWrapper currentPageName="ClaimsCenter"><ClaimsCenter /></LayoutWrapper>} />
      <Route path="/PlatformDataMap" element={
        <LayoutWrapper currentPageName="PlatformDataMap">
          <PlatformDataMap />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App