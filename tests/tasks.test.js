
const request = require("supertest");
const app = require("../app");

describe("Task API", () => {
  test("GET /tasks returns status 200", async () => {
    const response = await request(app).get("/tasks");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("POST /tasks creates a new task", async () => {
    const response = await request(app)
      .post("/tasks")
      .send({
        title: "Learn backend development"
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Learn backend development");
    expect(response.body.completed).toBe(false);
    expect(response.body.id).toBeDefined();
  });

  test("POST /task that reject empty string",async()=>{
  	const response= await request(app)
  	.post('/tasks')
  	.send({
  		title:"" 
  	})
  	expect(response.status).toBe(400);
  	expect(response.body.message).toBe(
  		"Title is required"
  	)
  })

  test('POST / task that reject a non string title',async()=>{
  	const response=await request(app)
  	.post('/tasks')
  	.send({
  		title:123
  	})
  	expect(response.status).toBe(400);
  	expect(response.body.message).toBe(
  		'Title is required'
  	)
  })



  test("POST /tasks rejects a non-boolean completed value", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({
          title: "Learn Express",
          completed: "yes"
        });
  
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Completed must be a boolean"
      );
    });
   
     test("PATCH /tasks/:id updates a task", async () => {
       // First, create a task for this test.
       const created = await request(app)
         .post("/tasks")
         .send({
           title: "Learn JavaScript"
         });
   
       expect(created.status).toBe(201);
   
       const taskId = created.body.id;
   
       // Now, update that task.
       const response = await request(app)
         .patch(`/tasks/${taskId}`)
         .send({
           completed: true
         });
   
       expect(response.status).toBe(200);
       expect(response.body.id).toBe(taskId);
       expect(response.body.title).toBe("Learn JavaScript");
       expect(response.body.completed).toBe(true);
     });


   
     test("DELETE /tasks/:id deletes a task", async () => {
       // Create a task specifically for this test.
       const created = await request(app)
         .post("/tasks")
         .send({
           title: "Task to delete"
         });
   
       expect(created.status).toBe(201);
   
       const taskId = created.body.id;
   
       // Delete the task we just created.
       const deleted = await request(app)
         .delete(`/tasks/${taskId}`);
   
       expect(deleted.status).toBe(200);
       expect(deleted.body.id).toBe(taskId);
       expect(deleted.body.title).toBe("Task to delete");
   
       // Confirm that the task no longer exists.
       const found = await request(app)
         .get(`/tasks/${taskId}`);
   
       expect(found.status).toBe(404);
       expect(found.body.message).toBe("Task not found");
     });


   test('GET /task/:id rejects a non numeric ID',async()=>{
   	const response=await request(app).get('/tasks/abc');
   	expect(response.status).toBe(400);
   	expect(response.body.message).toBe(
   		"Invalid task id"
   	)
   })

   test('GET /task/:id returns a 404 not found',async()=>{
   	const response=await request(app).get('/tasks/9999999');
   	expect(response.status).toBe(404);
   	expect(response.body.message).toBe(
   		"Task not found"
   	)
   })

   test("POST /task rejects malformed JSON formart",async()=>{
   	const response=await request(app).post('/tasks')
   	.set("Content-Type","application/json")
   	.send('{"title":"Learn javaScript"')
   	expect(response.status).toBe(400)
   	expect(response.body.message).toBe(
   		"Invalid JSON format"
   	)
   })
});
