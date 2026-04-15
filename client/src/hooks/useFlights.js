//custome hook that polls the express server for live flight data every 10 seconds
//stores the result in Zustand so any component can access it

import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query'
import { fetchFlights } from "../services/flightService";
import useGlobeStore from "../store/globeStore";

const useFlights = (lat, lon, dist) => {
    const setFlights = useGlobeStore((state) => state.setFlights)
    
    const queryFn = () => fetchFlights(lat, lon, dist)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['flights', lat, lon, dist],
        queryFn, 
        refetchInterval: 10000, //poll every 10 seconds
        staleTime: 5000,        //Consider data fresh for 5 seconds
    })

    //whenever new data comes in, push it into the Zustand store
    useEffect(() => {
        if (data) {
            setFlights(data)
        }
    }, [data, setFlights])

    return { isLoading, isError }
}

export default useFlights