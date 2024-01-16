import { Routes, Route, Outlet, Link } from "react-router-dom";
import NumSubmissionsPanel from "./NumSubmissionsPanel";
import SubmissionTrendsPanel from "./SubmissionTrendsPanel";
import WhoIsHiringNumGraph from "./WhoIsHiringNumGraph";
import WhoIsHiringTrendsPanel from "./WhoIsHiringTrendsPanel";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-orange-400 px-8 py-4">
        <div className="flex justify-between items-center text-gray-800">
          <h1 className="text-4xl font-bold">Hacker News Trends</h1>
          <nav>
            <ul className="flex">
              <li className="mr-6">
                <Link to="/" className="font-semibold hover:underline">Submissions</Link>
              </li>
              <li>
                <Link to="/whoishiring" className="font-semibold hover:underline">Hiring Trends</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="bg-white">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<SubmissionsPage />} />
            <Route path="whoishiring" element={<WhoIsHiring />} />
          </Route>
        </Routes>
      </div>
    </div>
  )
}

function Layout() {
  return (
    <div className="bg-white flex-grow px-14 mt-4 overflow-visible">
      <Outlet />
    </div>
  )
}


function SubmissionsPage() {

  return (
    <div className="bg-white text-gray-700">
      <div className="mb-1">
        <NumSubmissionsPanel />
      </div>
      <SubmissionTrendsPanel />
    </div>
  );
}


function WhoIsHiring() {
  return (
    <div className="bg-white text-gray-700">
      <h2 className="text-2xl">Number of comments</h2>
      <p>The number of comments on the monthly <i>Ask HN: Who is hiring? </i>thread. Use the checkbox to toggle between displaying the count of only the top-level comments or the total number.</p>
      <WhoIsHiringNumGraph />
      <WhoIsHiringTrendsPanel />
    </div>
  );
}

export default App
