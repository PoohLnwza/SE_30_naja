"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function ResultPage(){

  const params = useSearchParams();

  const score = useMemo(()=>{
    const s = Number(params.get("score"));
    if(isNaN(s)) return 0;
    return s;
  },[params]);

  let result = "";
  let color = "";

  if(score <= 3){
    result = "Low ADHD Risk";
    color = "green";
  }
  else if(score <= 5){
    result = "Moderate ADHD Risk";
    color = "orange";
  }
  else{
    result = "Possible ADHD";
    color = "red";
  }

  return(

    <div className="page">

      <div className="card">

        <h1 className="title">Assessment Result</h1>

        <h2>Total Score: {score}</h2>

        <h2 style={{color}}>
          {result}
        </h2>

        <p style={{marginTop:20}}>
          This result is only a preliminary screening and
          does not replace professional diagnosis.
        </p>

        <button
          style={{marginTop:20}}
          onClick={()=>window.location.href="/"}
        >
          Take Assessment Again
        </button>

      </div>

    </div>

  )

}