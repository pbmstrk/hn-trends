import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Label } from 'recharts';
import formatDate from './helper';


function Checkbox({ checked, onChange }) {
    return (
      <label className="inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="form-checkbox h-5 w-5 text-blue-600 mr-2"
        />Include only top-level comments.
      </label>
    )
  }


function WhoIsHiringNumGraph() {
    const [data, setData] = useState([]);
    const [includeOnlyTopLevel, setIncludeOnlyTopLevel] = useState(true);
  
    const handleCheckboxChange = (e) => {
      setIncludeOnlyTopLevel(e.target.checked);
    }
  
    let apiURL = import.meta.env.VITE_API_URL;
  
    const fetchData = () => {
      fetch(`${apiURL}/hiring/history?toplevel_only=${includeOnlyTopLevel}`)
        .then(response => response.json())
        .then(data => {
          setData(data);
        })
        .catch(error => {
          console.error("There was an error fetching data:", error);
        });
    }
  
    useEffect(() => { fetchData() }, [includeOnlyTopLevel])
  
  
    return (
      <div>
        <Checkbox checked={includeOnlyTopLevel} onChange={handleCheckboxChange} />
        <div className="flex flex-col items-center justify-center mt-3">
          <ResponsiveContainer width="90%" height={400}>
            <LineChart data={data} margin={{ left: 50, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
              <Line type="monotone" isAnimationActive={false} dataKey="num_comments" stroke="#ff7300" strokeWidth={2} dot={false} />
              <XAxis dataKey="year_month" tickFormatter={formatDate} interval={26} axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
                <Label value="Month" offset={-15} position="insideBottom" />
              </XAxis>
              <YAxis axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
                <Label value="No. comments" angle={-90} position="insideLeft" style={{ textAnchor: "middle" }} />
              </YAxis>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  
}
  
export default WhoIsHiringNumGraph