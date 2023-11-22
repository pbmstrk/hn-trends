import { useEffect, useState } from "react";

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
  
export default Table