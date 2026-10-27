
const express=require('express');
const taskRoutes=require('./routes/taskRoutes');
const authRoutes=require('./routes/authRoutes');

const app=express()


app.use(express.json())



app.get('/',(req,res)=>{
	res.send('Welcome to Task manager App')
})

app.use('/tasks',taskRoutes)
app.use("/auth",authRoutes)
app.use((req,res)=>{
	return res.status(404).json({
		message:'Route not found'
	})
})




app.use((err,req,res,next)=>{
	if(err instanceof SyntaxError &&
	err.status===400 && 'body' in err){
		return res.status(400).json({
			message:"Invalid JSON format"
		})
	}

	console.log('Unexpected error',err.message)
	return res.status(500).json({
		message:'Internal error'
	})
})

module.exports=app
