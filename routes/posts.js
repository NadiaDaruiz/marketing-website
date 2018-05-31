const Post = require('../models/post');

const express = require('express')
const router = express.Router()

router.get('/', function(req, res) {
    Post.find(function(err, posts) {
        res.render('posts', {
            posts: posts,
            message: res.locals.message,
            color: res.locals.color
        })
    });
});
router.get('/:id', function(req, res) {
    Post.findById(req.params.id, function(err, post) {
        res.render('post', {
            post: post
        })
    });
});

router.get('/edit/:id', function(req, res) {
    Post.findById(req.params.id, function(err, post) {
        res.render('editPost', {
            post: post,
            message: res.locals.message,
            color: res.locals.color
        })
    });
});

router.post('/', function(req, res) {
    var post = new Post(); // create a new instance of the post model
    post.name = req.body.name; // set the posts name (comes from the request)
    post.content = req.body.content; // set the posts name (comes from the request)
    post.order = req.body.order; // set the posts name (comes from the

    // save the post and check for errors
    post.save(function(err) {
        if (err)  
          res.send(err);
        console.log("Post created:", post);
        res.redirect("/posts?alert=created")
    });
});

router.delete('/delete/:id', function(req, res) {
    console.log("DELETE");
    Post.remove({
        _id: req.params.id
    }, function(err, post) {
        if (err)
            res.send(err);

        console.log("Post deleted")
        res.redirect("/posts?alert=deleted")
    });
});
router.put('/update/:id',function(req, res) {

    // use our post model to find the post we want
    Post.findById(req.params.id, function(err, post) {

        if (err)
            res.send(err);

        post.name = req.body.name; // update the posts info
        post.content = req.body.content; // update the posts info
        post.order = req.body.order; // update the posts info

        // save the post
        post.save(function(err) {
            if (err)
                res.send(err);

            console.log("Post updated:", post);
            res.redirect('/posts/edit/'+post._id+'?alert=deleted')
        });

    });
})
module.exports = router
