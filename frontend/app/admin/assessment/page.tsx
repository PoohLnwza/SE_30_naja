"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:5001";

export default function AdminAssessment() {

  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const router = useRouter();

  const loadData = async () => {
    const res = await fetch(`${API}/assessment`);
    const data = await res.json();
    setList(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createAssessment = async () => {

    if (!name) return;

    try {

      const res = await fetch(`${API}/assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          created_by: 1
        })
      });

      if (!res.ok) {
        alert("Create failed (user may not exist)");
        return;
      }

      setName("");
      loadData();

    } catch {
      alert("Create error");
    }

  };

  const deleteAssessment = async (id: number) => {

    if (!confirm("Delete assessment?")) return;

    const res = await fetch(`${API}/assessment/${id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Delete failed");
      return;
    }

    loadData();

  };

  const editAssessment = async (id: number, oldName: string) => {

    const newName = prompt("Edit name", oldName);
    if (!newName) return;

    await fetch(`${API}/assessment/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: newName
      })
    });

    loadData();

  };

  const filtered = list.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (

    <div className="page">
      <div className="card">

        <h1>Assessment Admin</h1>

        <h3>Create Assessment</h3>

        <input
          placeholder="Assessment name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={createAssessment}>
          Create
        </button>

        <hr/>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />

        <hr/>

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {filtered.map((a)=>(

              <tr key={a.assessment_id}>

                <td>{a.assessment_id}</td>

                <td>{a.name}</td>

                <td>

                  <button
                    onClick={() =>
                      router.push(`/admin/assessment/${a.assessment_id}`)
                    }
                  >
                    Manage Questions
                  </button>

                  <button
                    onClick={() =>
                      editAssessment(a.assessment_id, a.name)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      router.push(`/assessment/${a.assessment_id}`)
                    }
                  >
                    Open Test
                  </button>

                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `http://localhost:3000/assessment/${a.assessment_id}`
                      )
                    }
                  >
                    Copy Parent Link
                  </button>

                  <button
                    onClick={() =>
                      deleteAssessment(a.assessment_id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>
    </div>

  );

}