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
import { SeriesDetailRouteWrapper } from './pages/SeriesDetail';
import ClaimsCenter from './pages/ClaimsCenter';
import ChampImportAdmin from './pages/ChampImportAdmin';
import RaceCoreDriverEditor from './pages/RaceCoreDriverEditor';
import RaceCoreTeamEditor from './pages/RaceCoreTeamEditor';
import RaceCoreTrackEditor from './pages/RaceCoreTrackEditor';
import RaceCoreSeriesEditor from './pages/RaceCoreSeriesEditor';
import RaceCoreEventEditor from './pages/RaceCoreEventEditor';
import DriverProfileSetup from './pages/DriverProfileSetup';
import ManageProducts from './pages/ManageProducts';
import ManageInvoices from './pages/ManageInvoices';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import ProductDetail from './pages/ProductDetail';
import DigitalDownloads from './pages/DigitalDownloads';
import HashtagLibrary from './pages/HashtagLibrary';
import HashtagAnalytics from './pages/HashtagAnalytics';
import ManageDisciplineColors from './pages/ManageDisciplineColors';
import StandingsHome from './pages/StandingsHome';
import ManageMotorsportsHome from './pages/ManageMotorsportsHome';
import UserPublicProfile from './pages/UserPublicProfile';
import StorefrontHome from './pages/StorefrontHome';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import { CartProvider } from '@/lib/cartStore.jsx';
import CartDrawer from '@/components/cart/CartDrawer';
import StorefrontProductDetail from './pages/StorefrontProductDetail';
import StorefrontAdmin from './pages/admin/StorefrontAdmin';
import ManageStorefrontProducts from './pages/admin/ManageStorefrontProducts';
import ManageVariants from './pages/admin/ManageVariants';
import ManageCollections from './pages/admin/ManageCollections';
import ManageOrders from './pages/admin/ManageOrders';
import ManageCustomers from './pages/admin/ManageCustomers';
import ManageDiscounts from './pages/admin/ManageDiscounts';
import ManageReviews from './pages/admin/ManageReviews';
import ManageHeroSlides from './pages/admin/ManageHeroSlides';
import ManageStorefrontSettings from './pages/admin/ManageStorefrontSettings';
import EventFile from './pages/EventFile';
import RaceControlEvents from './pages/RaceControlEvents';
import RaceControlLayout from './components/racecontrol/RaceControlLayout';
import RaceCoreDashboard from './pages/RaceCoreDashboard';
import ManageDrivers from './pages/ManageDrivers';
import ManageTeams from './pages/ManageTeams';
import ManageTracks from './pages/ManageTracks';
import ManageSeries from './pages/ManageSeries';
import ManageEvents from './pages/ManageEvents';
import RaceCoreStandings from './pages/RaceCoreStandings';
import RaceCoreLayout from './components/racecore/RaceCoreLayout';
import { Navigate } from 'react-router-dom';
import ManageSessions from './pages/ManageSessions';
import ManageResults from './pages/ManageResults';
import ManagePointsConfig from './pages/ManagePointsConfig';
import ManageDriverClaims from './pages/ManageDriverClaims';
import ManageAccess from './pages/ManageAccess';
import ManageEntityClaims from './pages/ManageEntityClaims';
import ManageCSVImportExport from './pages/ManageCSVImportExport';
import ManageCalendarSync from './pages/ManageCalendarSync';
import Diagnostics from './pages/Diagnostics';

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
      <Route path="/series/:slug" element={<LayoutWrapper currentPageName="SeriesDetail"><SeriesDetailRouteWrapper /></LayoutWrapper>} />
      <Route path="/ClaimsCenter" element={<LayoutWrapper currentPageName="ClaimsCenter"><ClaimsCenter /></LayoutWrapper>} />
      <Route path="/dashboard/claims" element={<LayoutWrapper currentPageName="ClaimsCenter"><ClaimsCenter /></LayoutWrapper>} />
      <Route path="/management/champ-import" element={<LayoutWrapper currentPageName="ChampImportAdmin"><ChampImportAdmin /></LayoutWrapper>} />
      {/* Race Core canonical editor routes */}
      <Route path="/race-core/drivers/:id" element={<LayoutWrapper currentPageName="RaceCoreDriverEditor"><RaceCoreDriverEditor /></LayoutWrapper>} />
      <Route path="/race-core/teams/:id" element={<LayoutWrapper currentPageName="RaceCoreTeamEditor"><RaceCoreTeamEditor /></LayoutWrapper>} />
      <Route path="/race-core/tracks/:id" element={<LayoutWrapper currentPageName="RaceCoreTrackEditor"><RaceCoreTrackEditor /></LayoutWrapper>} />
      <Route path="/race-core/series/:id" element={<LayoutWrapper currentPageName="RaceCoreSeriesEditor"><RaceCoreSeriesEditor /></LayoutWrapper>} />
      <Route path="/race-core/events/:id" element={<LayoutWrapper currentPageName="RaceCoreEventEditor"><RaceCoreEventEditor /></LayoutWrapper>} />
      <Route path="/DriverProfileSetup" element={<LayoutWrapper currentPageName="DriverProfileSetup"><DriverProfileSetup /></LayoutWrapper>} />
      <Route path="/management/products" element={<LayoutWrapper currentPageName="ManageProducts"><ManageProducts /></LayoutWrapper>} />
      <Route path="/management/invoices" element={<LayoutWrapper currentPageName="ManageInvoices"><ManageInvoices /></LayoutWrapper>} />
      <Route path="/checkout-success" element={<LayoutWrapper currentPageName="CheckoutSuccess"><CheckoutSuccess /></LayoutWrapper>} />
      <Route path="/checkout-cancel" element={<LayoutWrapper currentPageName="CheckoutCancel"><CheckoutCancel /></LayoutWrapper>} />
      <Route path="/digital-downloads" element={<LayoutWrapper currentPageName="DigitalDownloads"><DigitalDownloads /></LayoutWrapper>} />
      <Route path="/hashtag-library" element={<LayoutWrapper currentPageName="HashtagLibrary"><HashtagLibrary /></LayoutWrapper>} />
      <Route path="/hashtag-analytics" element={<LayoutWrapper currentPageName="HashtagAnalytics"><HashtagAnalytics /></LayoutWrapper>} />
      <Route path="/management/discipline" element={<LayoutWrapper currentPageName="ManageDisciplineColors"><ManageDisciplineColors /></LayoutWrapper>} />
      <Route path="/StandingsHome" element={<LayoutWrapper currentPageName="StandingsHome"><StandingsHome /></LayoutWrapper>} />
      <Route path="/ManageMotorsportsHome" element={<LayoutWrapper currentPageName="ManageMotorsportsHome"><ManageMotorsportsHome /></LayoutWrapper>} />
      <Route path="/PlatformDataMap" element={
        <LayoutWrapper currentPageName="PlatformDataMap">
          <PlatformDataMap />
        </LayoutWrapper>
      } />
      {/* Public user profile route */}
      <Route path="/u/:username" element={<LayoutWrapper currentPageName="UserPublicProfile"><UserPublicProfile /></LayoutWrapper>} />

      {/* Cart & Checkout */}
      <Route path="/cart" element={<LayoutWrapper currentPageName="Cart"><Cart /></LayoutWrapper>} />
      <Route path="/checkout" element={<LayoutWrapper currentPageName="Checkout"><Checkout /></LayoutWrapper>} />
      <Route path="/order-confirmation" element={<LayoutWrapper currentPageName="OrderConfirmation"><OrderConfirmation /></LayoutWrapper>} />

      {/* Storefront routes */}
      <Route path="/store" element={<LayoutWrapper currentPageName="StorefrontHome"><StorefrontHome /></LayoutWrapper>} />
      <Route path="/product/:slug" element={<LayoutWrapper currentPageName="StorefrontProductDetail"><StorefrontProductDetail /></LayoutWrapper>} />
      <Route path="/collection/:slug" element={<LayoutWrapper currentPageName="StorefrontHome"><StorefrontHome /></LayoutWrapper>} />

      {/* Storefront admin routes */}
      <Route path="/admin/storefront" element={<LayoutWrapper currentPageName="StorefrontAdmin"><StorefrontAdmin /></LayoutWrapper>} />
      <Route path="/admin/products" element={<LayoutWrapper currentPageName="ManageStorefrontProducts"><ManageStorefrontProducts /></LayoutWrapper>} />
      <Route path="/admin/variants" element={<LayoutWrapper currentPageName="ManageVariants"><ManageVariants /></LayoutWrapper>} />
      <Route path="/admin/collections" element={<LayoutWrapper currentPageName="ManageCollections"><ManageCollections /></LayoutWrapper>} />
      <Route path="/admin/orders" element={<LayoutWrapper currentPageName="ManageOrders"><ManageOrders /></LayoutWrapper>} />
      <Route path="/admin/customers" element={<LayoutWrapper currentPageName="ManageCustomers"><ManageCustomers /></LayoutWrapper>} />
      <Route path="/admin/discounts" element={<LayoutWrapper currentPageName="ManageDiscounts"><ManageDiscounts /></LayoutWrapper>} />
      <Route path="/admin/reviews" element={<LayoutWrapper currentPageName="ManageReviews"><ManageReviews /></LayoutWrapper>} />
      <Route path="/admin/hero-slides" element={<LayoutWrapper currentPageName="ManageHeroSlides"><ManageHeroSlides /></LayoutWrapper>} />
      <Route path="/admin/storefront-settings" element={<LayoutWrapper currentPageName="ManageStorefrontSettings"><ManageStorefrontSettings /></LayoutWrapper>} />
      
      {/* Legacy route redirect */}
      <Route path="/RegistrationDashboard" element={<Navigate to="/racecore" replace />} />

      {/* R8AO: All /racecore/* routes inside RaceCoreLayout — no public LayoutWrapper */}
      <Route element={<RaceCoreLayout />}>
        <Route path="/racecore" element={<RaceCoreDashboard />} />
        <Route path="/racecore/standings" element={<RaceCoreStandings />} />
        <Route path="/racecore/standings/:seriesId" element={<RaceCoreStandings />} />
        <Route path="/racecore/standings/:seriesId/:seasonYear" element={<RaceCoreStandings />} />
        {/* Records pages in embedded mode — ManagementLayout suppresses its own sidebar/header */}
        <Route path="/racecore/records/drivers" element={<ManageDrivers embedded={true} />} />
        <Route path="/racecore/records/teams" element={<ManageTeams embedded={true} />} />
        <Route path="/racecore/records/tracks" element={<ManageTracks embedded={true} />} />
        <Route path="/racecore/records/series" element={<ManageSeries embedded={true} />} />
        <Route path="/racecore/records/events" element={<ManageEvents embedded={true} />} />
        {/* R9AE: Operational system routes */}
        <Route path="/racecore/records/sessions" element={<ManageSessions embedded={true} />} />
        <Route path="/racecore/records/results" element={<ManageResults embedded={true} />} />
        <Route path="/racecore/records/points-rulesets" element={<ManagePointsConfig embedded={true} />} />
        <Route path="/racecore/media/applications" element={<ManageMediaApplications embedded={true} />} />
        <Route path="/racecore/media/assignments" element={<ManageAssignments embedded={true} />} />
        <Route path="/racecore/media/requests" element={<ManageRequests embedded={true} />} />
        <Route path="/racecore/media/revenue" element={<ManageRevenue embedded={true} />} />
        <Route path="/racecore/access/claims" element={<ManageDriverClaims embedded={true} />} />
        <Route path="/racecore/access/entity-claims" element={<ManageEntityClaims embedded={true} />} />
        <Route path="/racecore/access/management" element={<ManageAccess embedded={true} />} />
        <Route path="/racecore/data/csv" element={<ManageCSVImportExport embedded={true} />} />
        <Route path="/racecore/data/calendar-sync" element={<ManageCalendarSync embedded={true} />} />
        <Route path="/racecore/data/champ-import" element={<ChampImportAdmin embedded={true} />} />
        <Route path="/racecore/diagnostics" element={<Diagnostics embedded={true} />} />
      </Route>

      {/* Legacy /Manage* routes remain alive via the pagesConfig loop above — unchanged */}
      
      {/* R8G: RaceControlLayout wraps all /race-control/* routes with RaceControlProvider */}
      <Route element={<LayoutWrapper currentPageName="RaceControl"><RaceControlLayout /></LayoutWrapper>}>
        {/* R8D: Event Directory */}
        <Route path="/race-control/events" element={<RaceControlEvents />} />
        {/* R8B: Event-first race control routes */}
        <Route path="/race-control/events/:eventId" element={<EventFile />} />
        <Route path="/race-control/events/:eventId/:panel" element={<EventFile />} />
      </Route>
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <Router>
            <AuthenticatedApp />
            <CartDrawer />
          </Router>
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App