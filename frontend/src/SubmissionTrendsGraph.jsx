import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Label, Legend } from 'recharts';


function SubmissionTrendsGraph({ keywords, setClickedValue }) {
    const [data, setData] = useState([]);
    let apiURL = import.meta.env.VITE_API_URL;
  
  
    const fetchData = () => {
      fetch(`${apiURL}/submissions/occurrences?keywords=${keywords.map(x => encodeURIComponent(x)).join(",")}`)
        .then(response => response.json())
        .then(data => {
          setData(data);
        })
        .catch(error => {
          console.error("There was an error fetching data:", error);
        });
    }
  
    useEffect(() => { fetchData() }, [keywords]);
  
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#83a6ed', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#00ced1'];
  
    // Handler for click events on the dot
    const handleClick = (data) => {
      setClickedValue({ keyword: data.dataKey, year_month: data.payload.year_month });
    }
  
    if (data.length > 0) {
      return (
        <div className="flex flex-col items-center justify-center mt-3">
          <ResponsiveContainer width="90%" height={400}>
            <LineChart data={data} margin={{ left: 50, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
              {keywords.map((key, index) =>
                <Line
                  type="monotone"
                  dataKey={key}
                  key={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ onClick: (_, payload) => handleClick(payload) }}
                />)}
              <XAxis dataKey="year_month" interval={24} axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
                <Label value="Date" offset={-15} position="insideBottom" />
              </XAxis>
              <YAxis>
                <Label value="No. occurrences" angle={-90} position="insideLeft" style={{ textAnchor: "middle" }}></Label>
              </YAxis>
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: "10px" }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }
}
  
export default SubmissionTrendsGraph