import express from "express"
import bodyParser from "body-parser"
import axios from "axios"
import pg from "pg"

const app = express();
const port = 3000;

//const URL = `http://openlibrary.org/api/volumes/brief/isbn/${idValue}.json`
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"))
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "bookreviews",
    password: "ARapheal22!",
    port: 5432
});
db.connect();

app.get("/", async (req, res) => {
    const response = (await db.query("select reviews.id, isbn, description, rating, title, author, book_url, author_url from reviews inner join book_data on reviews.id = book_data.id")).rows
    res.render("index.ejs", {reviews: response})
})

app.post("/add", async (req, res) => {
    res.render("add.ejs")
})

app.post("/newbook", async (req, res) => {
    if (Number(req.body.isbn) && Number(req.body.rating)){
    var retrieved = (await axios.get(`http://openlibrary.org/api/volumes/brief/isbn/${req.body.isbn}.json`)).data.records
    if (typeof(retrieved) != undefined){
        var bookKey = (Object.keys(retrieved)[0])
        var newBook = {
            title: retrieved[bookKey].data.title,
            author: retrieved[bookKey].data.authors[0].name,
            isbn: retrieved[bookKey].isbns[0],
            book_url: retrieved[bookKey].recordURL,
            author_url: retrieved[bookKey].data.authors[0].url
        }
        var newReview = {
            description: req.body.description,
            rating: Number(req.body.rating),
            isbn: Number(req.body.isbn)
        }
        const bookId = await db.query("insert into reviews (description, rating, isbn) values ($1, $2, $3) returning id", [newReview.description, newReview.rating, newReview.isbn])
        await db.query("insert into book_data values ($1, $2, $3, $4, $5)", [Number(bookId), newBook.title, newBook.author, newBook.book_url, newBook.author_url])
        res.redirect("/")
    }else{
        res.render("add.ejs", {error: "Book not found"})
    }
}else{
    res.render("add.ejs", {error: "Invalid Inputs"})
}
})

app.post("/edit", async (req, res) => {
    const editReview = (await db.query("select * from reviews where id = $1", [req.body.edit])).rows[0]
    res.render("edit.ejs", {review: editReview})
})

app.post("/editbook", async (req, res) => {
    if (Number(req.body.isbn) && Number(req.body.rating)){
        await db.query("update reviews set isbn = $1, description = $2, rating = $3 where id = $4 returning description", [Number(req.body.isbn), req.body.description, Math.floor(Number(req.body.rating)), Number(req.body.btn)])
        res.redirect("/")
    }else{
        res.render("edit.ejs", {review: req.body, error: "Invalid Inputs"})
    }
})

app.listen(port, () =>{
    console.log(`Server running on ${port}`)
})