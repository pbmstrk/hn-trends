import WhoIsHiringTrendsGraph from "./WhoIsHiringTrendsGraph"

function WhoIsHiringTrendsPanel() {
    return (
      <div>
        <h2 className="text-2xl">Trends</h2>
        <p className="mb-2">Use the dropdown to display the number of comments that include the selected keywords.</p>
        <WhoIsHiringTrendsGraph />
      </div>
    )
}
  
export default WhoIsHiringTrendsPanel