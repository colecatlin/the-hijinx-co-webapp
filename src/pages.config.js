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
import ApparelHome from './pages/ApparelHome';
import Contact from './pages/Contact';
import CreativeServices from './pages/CreativeServices';
import Diagnostics from './pages/Diagnostics';
import DriverDirectory from './pages/DriverDirectory';
import DriverEditor from './pages/DriverEditor';
import DriverProfile from './pages/DriverProfile';
import EntityEditor from './pages/EntityEditor';
import EventDirectory from './pages/EventDirectory';
import EventProfile from './pages/EventProfile';
import EventResults from './pages/EventResults';
import FoodBeverage from './pages/FoodBeverage';
import Home from './pages/Home';
import Hospitality from './pages/Hospitality';
import Learning from './pages/Learning';
import ManageAccess from './pages/ManageAccess';
import ManageAnnouncements from './pages/ManageAnnouncements';
import ManageDriverCommunity from './pages/ManageDriverCommunity';
import ManageDriverMedia from './pages/ManageDriverMedia';
import ManageDriverPartnership from './pages/ManageDriverPartnership';
import ManageDriverPerformance from './pages/ManageDriverPerformance';
import ManageDriverPrograms from './pages/ManageDriverPrograms';
import ManageDrivers from './pages/ManageDrivers';
import ManageEvents from './pages/ManageEvents';
import ManageFoodBeverage from './pages/ManageFoodBeverage';
import ManageIssues from './pages/ManageIssues';
import ManageResults from './pages/ManageResults';
import ManageSeries from './pages/ManageSeries';
import ManageSessions from './pages/ManageSessions';
import ManageStandings from './pages/ManageStandings';
import ManageStories from './pages/ManageStories';
import ManageTeams from './pages/ManageTeams';
import ManageTech from './pages/ManageTech';
import ManageTracks from './pages/ManageTracks';
import Management from './pages/Management';
import MotorsportsHome from './pages/MotorsportsHome';
import OutletAdvertising from './pages/OutletAdvertising';
import OutletHome from './pages/OutletHome';
import OutletIssuePage from './pages/OutletIssuePage';
import OutletIssues from './pages/OutletIssues';
import OutletStoryPage from './pages/OutletStoryPage';
import OutletSubmit from './pages/OutletSubmit';
import Profile from './pages/Profile';
import ResultsDirectory from './pages/ResultsDirectory';
import ResultsHome from './pages/ResultsHome';
import ScheduleHome from './pages/ScheduleHome';
import SeriesHome from './pages/SeriesHome';
import SessionProfile from './pages/SessionProfile';
import StandingsHome from './pages/StandingsHome';
import TeamDirectory from './pages/TeamDirectory';
import TechHome from './pages/TechHome';
import TrackDirectory from './pages/TrackDirectory';
import SeriesDetail from './pages/SeriesDetail';
import TrackProfile from './pages/TrackProfile';
import TeamProfile from './pages/TeamProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AcceptInvitation": AcceptInvitation,
    "ApparelHome": ApparelHome,
    "Contact": Contact,
    "CreativeServices": CreativeServices,
    "Diagnostics": Diagnostics,
    "DriverDirectory": DriverDirectory,
    "DriverEditor": DriverEditor,
    "DriverProfile": DriverProfile,
    "EntityEditor": EntityEditor,
    "EventDirectory": EventDirectory,
    "EventProfile": EventProfile,
    "EventResults": EventResults,
    "FoodBeverage": FoodBeverage,
    "Home": Home,
    "Hospitality": Hospitality,
    "Learning": Learning,
    "ManageAccess": ManageAccess,
    "ManageAnnouncements": ManageAnnouncements,
    "ManageDriverCommunity": ManageDriverCommunity,
    "ManageDriverMedia": ManageDriverMedia,
    "ManageDriverPartnership": ManageDriverPartnership,
    "ManageDriverPerformance": ManageDriverPerformance,
    "ManageDriverPrograms": ManageDriverPrograms,
    "ManageDrivers": ManageDrivers,
    "ManageEvents": ManageEvents,
    "ManageFoodBeverage": ManageFoodBeverage,
    "ManageIssues": ManageIssues,
    "ManageResults": ManageResults,
    "ManageSeries": ManageSeries,
    "ManageSessions": ManageSessions,
    "ManageStandings": ManageStandings,
    "ManageStories": ManageStories,
    "ManageTeams": ManageTeams,
    "ManageTech": ManageTech,
    "ManageTracks": ManageTracks,
    "Management": Management,
    "MotorsportsHome": MotorsportsHome,
    "OutletAdvertising": OutletAdvertising,
    "OutletHome": OutletHome,
    "OutletIssuePage": OutletIssuePage,
    "OutletIssues": OutletIssues,
    "OutletStoryPage": OutletStoryPage,
    "OutletSubmit": OutletSubmit,
    "Profile": Profile,
    "ResultsDirectory": ResultsDirectory,
    "ResultsHome": ResultsHome,
    "ScheduleHome": ScheduleHome,
    "SeriesHome": SeriesHome,
    "SessionProfile": SessionProfile,
    "StandingsHome": StandingsHome,
    "TeamDirectory": TeamDirectory,
    "TechHome": TechHome,
    "TrackDirectory": TrackDirectory,
    "SeriesDetail": SeriesDetail,
    "TrackProfile": TrackProfile,
    "TeamProfile": TeamProfile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};