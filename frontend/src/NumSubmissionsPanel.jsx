import { useEffect, useState } from "react";
import NumSubmissionsGraph from "./NumSubmissionsGraph";

function NumSubmissionsPanel() {
    const [numSubmissions, setNumSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Loading state

    let apiURL = import.meta.env.VITE_API_URL;

    const fetchData = () => {
        setIsLoading(true); // Start loading
        fetch(`${apiURL}/submissions/history`)
            .then(response => response.json())
            .then(data => {
                setNumSubmissions(data);
                setIsLoading(false); // Stop loading when data is fetched
            })
            .catch(error => {
                console.error("There was an error fetching data:", error);
                setIsLoading(false); // Stop loading in case of an error
            });
    };

    useEffect(() => { fetchData(); }, [])

    if (isLoading) {
        return (
            <div className="mb-1">
                <h1 className="text-2xl mb-1">Number of submissions</h1>
                <div className="mt-8 flex justify-center">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-1">
            <h1 className="text-2xl mb-1">Number of submissions</h1>
            <NumSubmissionsGraph data={numSubmissions} />
        </div>
    );
}

export default NumSubmissionsPanel;
