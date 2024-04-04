import { useState } from "react";
import SubmissionTrendsGraph from "./SubmissionTrendsGraph";
import Table from "./Table";
import MultiSelectDropdown from "./MulitSelectDropdown";


function SubmissionTrendsPanel() {
    const [selectedValues, setSelectedValues] = useState([]);
    const [clickedValue, setClickedValue] = useState({});
  
    const handleSelectionChange = (values) => {
      let keywords = values.map(x => x.value);
      setSelectedValues(keywords);
    }
    
    return (
      <div>
        <p className="mb-2">Use the dropdown option below to display the trend in frequency of certain keywords in the
          titles of submissions on Hacker News. Clicking on a trace will display a sample of submissions that
          contain the selected keyword from the corresponding time period.</p>
        <MultiSelectDropdown onSelectionChange={handleSelectionChange} hiring={false} />
        <SubmissionTrendsGraph keywords={selectedValues} setClickedValue={setClickedValue} />
        {selectedValues.includes(clickedValue.keyword) && <Table clickedValue={clickedValue} />}
      </div>
    )
}
  
export default SubmissionTrendsPanel