"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:5001";

export default function AssessmentEditor() {

  const params = useParams();
  const id = params.id;

  const [assessment,setAssessment] = useState<any>(null);
  const [newQuestion,setNewQuestion] = useState("");
  const [search,setSearch] = useState("");

  const loadData = async ()=>{

    const res = await fetch(`${API}/assessment/${id}/full`);

    if(!res.ok){
      alert("Assessment not found");
      return;
    }

    const data = await res.json();
    setAssessment(data);

  };

  useEffect(()=>{

    if(id) loadData();

  },[id]);

  const addQuestion = async ()=>{

    if(!newQuestion) return;

    await fetch(`${API}/question`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        assessment_id:Number(id),
        question_text:newQuestion
      })
    });

    setNewQuestion("");
    loadData();

  };

  const deleteQuestion = async (qid:number)=>{

    if(!confirm("Delete question?")) return;

    const res = await fetch(`${API}/question/${qid}`,{
      method:"DELETE"
    });

    if(!res.ok){
      alert("Cannot delete question (has answers)");
      return;
    }

    loadData();

  };

  const addChoice = async (qid:number)=>{

    const text = prompt("Choice text");
    const score = prompt("Score");

    if(!text || score===null) return;

    await fetch(`${API}/choice`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        question_id:qid,
        choice_text:text,
        score:Number(score)
      })
    });

    loadData();

  };

  const deleteChoice = async (cid:number)=>{

    if(!confirm("Delete choice?")) return;

    const res = await fetch(`${API}/choice/${cid}`,{
      method:"DELETE"
    });

    if(!res.ok){
      alert("Cannot delete choice (has answers)");
      return;
    }

    loadData();

  };

  if(!assessment) return <p>Loading...</p>;

  const filtered = assessment.question.filter((q:any)=>
    q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  return(

    <div>

      <h1>{assessment.name}</h1>

      <input
        placeholder="Search question"
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
      />

      <hr/>

      <h3>Add Question</h3>

      <input
        value={newQuestion}
        onChange={(e)=>setNewQuestion(e.target.value)}
      />

      <button onClick={addQuestion}>
        Add Question
      </button>

      <hr/>

      {filtered.map((q:any)=>(

        <div key={q.question_id}>

          <h3>{q.question_text}</h3>

          <button
            onClick={()=>deleteQuestion(q.question_id)}
          >
            Delete Question
          </button>

          <h4>Choices</h4>

          {q.choice.map((c:any)=>(

            <div key={c.choice_id}>

              {c.choice_text} ({c.score})

              <button
                onClick={()=>deleteChoice(c.choice_id)}
              >
                Delete
              </button>

            </div>

          ))}

          <button
            onClick={()=>addChoice(q.question_id)}
          >
            Add Choice
          </button>

        </div>

      ))}

    </div>

  );

}