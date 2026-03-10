"use client";

import { useEffect,useState } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:5001";

export default function AssessmentPage(){

  const params = useParams();
  const id = params.id;

  const [assessment,setAssessment] = useState<any>(null);
  const [answers,setAnswers] = useState<any>({});

  const loadData = async ()=>{

    const res = await fetch(`${API}/assessment/${id}/full`);
    const data = await res.json();

    setAssessment(data);

  };

  useEffect(()=>{

    if(id) loadData();

  },[id]);

  const selectChoice = (qid:number,cid:number)=>{

    setAnswers({
      ...answers,
      [qid]:cid
    });

  };

  const submit = async ()=>{

    console.log("answers",answers);

    alert("Submit success (demo)");

  };

  if(!assessment) return <p>Loading...</p>;

  return(

    <div style={{maxWidth:700,margin:"auto"}}>

      <h1>{assessment.name}</h1>

      {assessment.question.map((q:any)=>(

        <div key={q.question_id} style={{marginBottom:20}}>

          <h3>{q.question_text}</h3>

          {q.choice.map((c:any)=>(

            <div key={c.choice_id}>

              <label>

                <input
                  type="radio"
                  name={`q${q.question_id}`}
                  onChange={()=>
                    selectChoice(q.question_id,c.choice_id)
                  }
                />

                {c.choice_text}

              </label>

            </div>

          ))}

        </div>

      ))}

      <button onClick={submit}>
        Submit
      </button>

    </div>

  );

}