import { useEffect, useState } from "react";
import Select, { components } from 'react-select'


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

    return (
        <Select options={options} isMulti={true} onChange={handleChange}
            styles={{ menu: (base) => ({ ...base, position: 'relative' }) }}    
            components={{
                Option: Option,
                MultiValue: CustomMultiValue
            }}
        />
    )
}

const CustomMultiValue = (props) => {
    const imgUrl = new URL(`./assets/${props.data.image_path}`, import.meta.url)

    return (
        <components.MultiValue {...props} className="bg-blue-100  rounded">
            <div className="flex items-center">
                <img src={imgUrl} className="w-6 h-6 mr-2" />
                <components.MultiValueLabel {...props}>
                    <span>{props.data.display_name}</span>
                </components.MultiValueLabel>
            </div>
        </components.MultiValue>
    );
};


const Option = (props) => {

    const imgUrl = new URL(`./assets/${props.data.image_path}`, import.meta.url)

    return (
        <components.Option {...props} className="option-container">
            <div className="flex items-center">
                <img src={imgUrl} className="w-6 h-6 mr-2" />
                <span>{props.data.display_name}</span>
            </div>
        </components.Option>
    )
}

export default MultiSelectDropdown