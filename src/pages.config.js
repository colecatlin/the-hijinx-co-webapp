/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AcceptInvitation from './pages/AcceptInvitation';
import AdvertisementAnalytics from './pages/AdvertisementAnalytics';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ApparelHome from './pages/ApparelHome';
import CompetitionSystem from './pages/CompetitionSystem';
import Contact from './pages/Contact';
import CreativeServices from './pages/CreativeServices';
import Diagnostics from './pages/Diagnostics';
import DriverComparison from './pages/DriverComparison';
import DriverDirectory from './pages/DriverDirectory';
import DriverEditor from './pages/DriverEditor';
import DriverProfile from './pages/DriverProfile';
import DriverProgramProfile from './pages/DriverProgramProfile';
import DriverStats from './pages/DriverStats';
import EntityEditor from './pages/EntityEditor';
import EventDirectory from './pages/EventDirectory';
import EventProfile from './pages/EventProfile';
import EventResults from './pages/EventResults';
import FoodBeverage from './pages/FoodBeverage';
import Home from './pages/Home';
import Hospitality from './pages/Hospitality';
import Learning from './pages/Learning';
import ManageAccess from './pages/ManageAccess';
import ManageAdvertising from './pages/ManageAdvertising';
import ManageAnnouncements from './pages/ManageAnnouncements';
import ManageCSVImportExport from './pages/ManageCSVImportExport';
import ManageCalendarSync from './pages/ManageCalendarSync';
import ManageDriverClaims from './pages/ManageDriverClaims';
import ManageDriverCommunity from './pages/ManageDriverCommunity';
import ManageDriverMedia from './pages/ManageDriverMedia';
import ManageDriverPartnership from './pages/ManageDriverPartnership';
import ManageDriverPerformance from './pages/ManageDriverPerformance';
import ManageDriverPrograms from './pages/ManageDriverPrograms';
import ManageDrivers from './pages/ManageDrivers';
import ManageEvents from './pages/ManageEvents';
import ManageFoodBeverage from './pages/ManageFoodBeverage';
import ManageHomepage from './pages/ManageHomepage';
import ManageIssues from './pages/ManageIssues';
import ManagePointsConfig from './pages/ManagePointsConfig';
import ManageResults from './pages/ManageResults';
import ManageSeries from './pages/ManageSeries';
import ManageSessions from './pages/ManageSessions';
import ManageStandings from './pages/ManageStandings';
import ManageStories from './pages/ManageStories';
import ManageTeams from './pages/ManageTeams';
import ManageTech from './pages/ManageTech';
import ManageTracks from './pages/ManageTracks';
import Management from './pages/Management';
import MediaApply from './pages/MediaApply';
import MediaPortal from './pages/MediaPortal';
import MediaProfile from './pages/MediaProfile';
import MotorsportsHome from './pages/MotorsportsHome';
import MyDashboard from './pages/MyDashboard';
import OutletAdvertising from './pages/OutletAdvertising';
import OutletHome from './pages/OutletHome';
import OutletIssuePage from './pages/OutletIssuePage';
import OutletIssues from './pages/OutletIssues';
import OutletStoryPage from './pages/OutletStoryPage';
import OutletSubmit from './pages/OutletSubmit';
import Profile from './pages/Profile';
import Registration from './pages/Registration';
import RegistrationDashboard from './pages/RegistrationDashboard';
import RegistrationLanding from './pages/RegistrationLanding';
import ScheduleEmbed from './pages/ScheduleEmbed';
import ScheduleHome from './pages/ScheduleHome';
import SeriesDetail from './pages/SeriesDetail';
import SeriesHome from './pages/SeriesHome';
import SessionProfile from './pages/SessionProfile';
import StandingsHome from './pages/StandingsHome';
import TeamDirectory from './pages/TeamDirectory';
import TeamProfile from './pages/TeamProfile';
import TechHome from './pages/TechHome';
import TrackDirectory from './pages/TrackDirectory';
import TrackProfile from './pages/TrackProfile';
import UserDashboard from './pages/UserDashboard';
import EntityOnboarding from './pages/EntityOnboarding';
import ManageEntityClaims from './pages/ManageEntityClaims';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AcceptInvitation": AcceptInvitation,
    "AdvertisementAnalytics": AdvertisementAnalytics,
    "AnalyticsDashboard": AnalyticsDashboard,
    "ApparelHome": ApparelHome,
    "CompetitionSystem": CompetitionSystem,
    "Contact": Contact,
    "CreativeServices": CreativeServices,
    "Diagnostics": Diagnostics,
    "DriverComparison": DriverComparison,
    "DriverDirectory": DriverDirectory,
    "DriverEditor": DriverEditor,
    "DriverProfile": DriverProfile,
    "DriverProgramProfile": DriverProgramProfile,
    "DriverStats": DriverStats,
    "EntityEditor": EntityEditor,
    "EventDirectory": EventDirectory,
    "EventProfile": EventProfile,
    "EventResults": EventResults,
    "FoodBeverage": FoodBeverage,
    "Home": Home,
    "Hospitality": Hospitality,
    "Learning": Learning,
    "ManageAccess": ManageAccess,
    "ManageAdvertising": ManageAdvertising,
    "ManageAnnouncements": ManageAnnouncements,
    "ManageCSVImportExport": ManageCSVImportExport,
    "ManageCalendarSync": ManageCalendarSync,
    "ManageDriverClaims": ManageDriverClaims,
    "ManageDriverCommunity": ManageDriverCommunity,
    "ManageDriverMedia": ManageDriverMedia,
    "ManageDriverPartnership": ManageDriverPartnership,
    "ManageDriverPerformance": ManageDriverPerformance,
    "ManageDriverPrograms": ManageDriverPrograms,
    "ManageDrivers": ManageDrivers,
    "ManageEvents": ManageEvents,
    "ManageFoodBeverage": ManageFoodBeverage,
    "ManageHomepage": ManageHomepage,
    "ManageIssues": ManageIssues,
    "ManagePointsConfig": ManagePointsConfig,
    "ManageResults": ManageResults,
    "ManageSeries": ManageSeries,
    "ManageSessions": ManageSessions,
    "ManageStandings": ManageStandings,
    "ManageStories": ManageStories,
    "ManageTeams": ManageTeams,
    "ManageTech": ManageTech,
    "ManageTracks": ManageTracks,
    "Management": Management,
    "MediaApply": MediaApply,
    "MediaPortal": MediaPortal,
    "MediaProfile": MediaProfile,
    "MotorsportsHome": MotorsportsHome,
    "MyDashboard": MyDashboard,
    "OutletAdvertising": OutletAdvertising,
    "OutletHome": OutletHome,
    "OutletIssuePage": OutletIssuePage,
    "OutletIssues": OutletIssues,
    "OutletStoryPage": OutletStoryPage,
    "OutletSubmit": OutletSubmit,
    "Profile": Profile,
    "Registration": Registration,
    "RegistrationDashboard": RegistrationDashboard,
    "RegistrationLanding": RegistrationLanding,
    "ScheduleEmbed": ScheduleEmbed,
    "ScheduleHome": ScheduleHome,
    "SeriesDetail": SeriesDetail,
    "SeriesHome": SeriesHome,
    "SessionProfile": SessionProfile,
    "StandingsHome": StandingsHome,
    "TeamDirectory": TeamDirectory,
    "TeamProfile": TeamProfile,
    "TechHome": TechHome,
    "TrackDirectory": TrackDirectory,
    "TrackProfile": TrackProfile,
    "UserDashboard": UserDashboard,
    "EntityOnboarding": EntityOnboarding,
    "ManageEntityClaims": ManageEntityClaims,
}

export const pagesConfig = {
    mainPage: "ManagePointsConfig",
    Pages: PAGES,
    Layout: __Layout,
};