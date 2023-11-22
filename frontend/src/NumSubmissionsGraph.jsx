import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Label } from 'recharts';
import formatDate from './helper';


function NumSubmissionsGraph({ data }) {
    return (
      <div className="flex flex-col items-center justify-center mt-3">
        <ResponsiveContainer width="90%" height={400}>
          <LineChart data={data} margin={{ left: 50, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
            <Line type="monotone" isAnimationActive={false} dataKey="moving_avg" stroke="#ff7300" strokeWidth={2} dot={false} />
            <XAxis dataKey="submission_date" tickFormatter={formatDate} interval={800} axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
              <Label value="Date" offset={-15} position="insideBottom" />
            </XAxis>
            <YAxis axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
              <Label value="Moving Average" angle={-90} position="insideLeft" style={{ textAnchor: "middle" }} />
            </YAxis>
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
}
  
export default NumSubmissionsGraph