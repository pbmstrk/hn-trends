import { Routes, Route, Outlet, Link, useActionData } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Label, Legend } from 'recharts';
import Select, { components } from 'react-select'
import { useEffect, useState } from "react";


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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Submissions />} />
          <Route path="whoishiring" element={<WhoIsHiring />} />
        </Route>
      </Routes>
    </div>
  )
}

function Layout() {
  return (
    <div className="flex-grow px-14 mt-4">
      <Outlet />
    </div>
  )
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};



function NumSubmissionsGraph({ data }) {
  return (
    <div className="flex flex-col items-center justify-center mt-3">
      <ResponsiveContainer width="90%" height={400}>
        <LineChart data={data} margin={{ left: 50, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
          <Line type="monotone" dataKey="moving_avg" stroke="#ff7300" strokeWidth={2} dot={false} />
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

function Submissions() {

  const [numSubmissions, setNumSubmissions] = useState([]);

  let apiURL = import.meta.env.VITE_API_URL;

  const fetchData = () => {
    fetch(`${apiURL}/submissions`)
      .then(response => response.json())
      .then(data => {
        setNumSubmissions(data);
      })
      .catch(error => {
        console.error("There was an error fetching data:", error);
      });
  };

  useEffect(() => { fetchData() }, [])

  console.log(numSubmissions);

  return (
    <div className="text-gray-700">
      <div className="mb-1">
        <h1 className="text-2xl mb-1">Number of submissions</h1>
        <NumSubmissionsGraph data={numSubmissions} />
      </div>
      <SubmissionTrends />
    </div>
  );
}

function SubmissionTrends() {
  const [selectedValues, setSelectedValues] = useState([]);
  const [clickedValue, setClickedValue] = useState({});

  const handleSelectionChange = (values) => {
    let keywords = values.map(x => x.value);
    setSelectedValues(keywords);
  }

  console.log(clickedValue);

  return (
    <div>
      <h2 className="text-2xl">Trends</h2>
      <p className="mb-2">Use the dropdown option below to display the trend in frequency of certain keywords in the
        titles of submissions on Hacker News. Clicking on a trace will display a sample of submissions that
        contain the selected keyword from the corresponding time period.</p>
      <MultiSelectDropdown onSelectionChange={handleSelectionChange} hiring={false} />
      <KeywordTrendGraph keywords={selectedValues} setClickedValue={setClickedValue} />
      {selectedValues.includes(clickedValue.keyword) && <Table clickedValue={clickedValue} />}
    </div>
  )
}

function Table({ clickedValue }) {
  const [tableData, setTableData] = useState([]);
  let apiURL = import.meta.env.VITE_API_URL;

  const encodedValue = encodeURIComponent(clickedValue.keyword);

  useEffect(() => {
    if (clickedValue) {
      fetch(`${apiURL}/submissions/samples?keyword=${encodedValue}&year_month=${clickedValue.year_month}`)
        .then(response => response.json())
        .then(data => {
          setTableData(data);
        })
        .catch(error => {
          console.error("There was an error fetching table data:", error);
        });
    }
  }, [clickedValue]);


  if (tableData.length > 0) {
    return (
      <div className="overflow-x-auto mx-20">
        <table className='table'>
          <thead>
            <tr>
              <th>Title</th>
              <th>Submission Date</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, index) => (
              <tr key={index}>
                <td><a
                  className='text-blue-700'
                  href={`https://news.ycombinator.com/item?id=${item.objectid}`}
                  rel="noopener noreferrer"
                  target='_blank'>{item.title}
                </a></td>
                <td>{item.submission_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  };
}


function KeywordTrendGraph({ keywords, setClickedValue }) {
  const [data, setData] = useState([]);
  let apiURL = import.meta.env.VITE_API_URL;

  console.log(keywords.map(x => encodeURIComponent(x)).join(","));

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

function MultiSelectDropdown({ onSelectionChange, hiring }) {
  const [options, setOptions] = useState([]);
  let apiURL = import.meta.env.VITE_API_URL;

  const fetchData = () => {
    fetch(`${apiURL}/keywords?hiring=${hiring}`)
      .then(response => response.json())
      .then(data => {
        setOptions(data);
      })
      .catch(error => {
        console.error("There was an error fetching data:", error);
      });
  };

  useEffect(() => { fetchData() }, [])

  const handleChange = (selected) => {
    onSelectionChange(selected);
  }

  console.log(options)

  return (
    <Select options={options} isMulti={true} onChange={handleChange}
      components={{
        Option: Option,
        MultiValue: CustomMultiValue
      }}
    />
  )
}

const CustomMultiValue = (props) => {
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    import(`./assets/${props.data.image_path}`)
      .then(image => setImagePath(image.default))
      .catch(err => console.error("Failed to load image", err));
  }, [props.data.image_path]);

  return (
    <components.MultiValue {...props} className="bg-blue-100  rounded">
      <div className="flex items-center">
        <img src={imagePath} className="w-6 h-6 mr-2" />
        <components.MultiValueLabel {...props}>
          <span>{props.data.display_name}</span>
        </components.MultiValueLabel>
      </div>
    </components.MultiValue>
  );
};


const Option = (props) => {
  //const [imagePath, setImagePath] = useState('');

  const imgUrl = new URL(`./assets/${props.data.image_path}`, import.meta.url)

  // useEffect(() => {
  //   import(`./assets/${props.data.image_path}`)
  //     .then(image => setImagePath(image.default))
  //     .catch(err => console.error("Failed to load image", err));
  // }, [props.data.image_path]);

  return (
    <components.Option {...props} className="option-container">
      <div className="flex items-center">
        <img src={imgUrl} className="w-6 h-6 mr-2" />
        <span>{props.data.display_name}</span>
      </div>
    </components.Option>
  )
}

function WhoIsHiring() {
  return (
    <div>
      <h2 className="text-2xl">Number of comments</h2>
      <p>The number of comments on the monthly <i>Ask HN: Who is hiring? </i>thread. Use the checkbox to toggle between displaying the count of only the top-level comments or the total number.</p>
      <WhoIsHiringNumGraph />
      <HiringTrends />
    </div>
  );
}

function WhoIsHiringNumGraph() {
  const [data, setData] = useState([]);
  const [includeOnlyTopLevel, setIncludeOnlyTopLevel] = useState(true);

  const handleCheckboxChange = (e) => {
    setIncludeOnlyTopLevel(e.target.checked);
  }

  let apiURL = import.meta.env.VITE_API_URL;

  const fetchData = () => {
    fetch(`${apiURL}/hiring?toplevel_only=${includeOnlyTopLevel}`)
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
            <Line type="monotone" dataKey="num_comments" stroke="#ff7300" strokeWidth={2} dot={false} />
            <XAxis dataKey="year_month" tickFormatter={formatDate} interval={12} axisLine={{ stroke: '#ccc' }} tickLine={{ stroke: '#ccc' }}>
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

function Checkbox({ checked, onChange }) {
  return (
    <label className="inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-5 w-5 text-blue-600"
      />Include only top-level comments.
    </label>
  )
}

function HiringTrends() {
  return (
    <div>
      <h2 className="text-2xl">Trends</h2>
      <p className="mb-2">Use the dropdown to display the number of comments that include the selected keywords.</p>
      <HiringTrendsGraph />
    </div>
  )
}

function HiringTrendsGraph() {
  const [data, setData] = useState([]);
  const [keywords, setKeywords] = useState([]);

  const handleSelectionChange = (values) => {
    let keywords = values.map(x => x.value);
    setKeywords(keywords);
  }

  let apiURL = import.meta.env.VITE_API_URL;

  const fetchData = () => {
    fetch(`${apiURL}/hiring/occurrences?keywords=${keywords.map(x => encodeURIComponent(x)).join(",")}`)
      .then(response => response.json())
      .then(data => {
        setData(data);
      })
      .catch(error => {
        console.error("There was an error fetching data:", error);
      });
  }

  useEffect(() => { fetchData() }, [keywords])
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#83a6ed', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#00ced1'];


  return (
    <>
      <MultiSelectDropdown hiring={true} onSelectionChange={handleSelectionChange} />
      {data.length > 0 && <div className="flex flex-col items-center justify-center mt-3">
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
      </div>}
    </>
  )
}

export default App
