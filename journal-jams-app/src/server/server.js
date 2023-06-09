const express = require('express');
const mongoose = require('mongoose');
const Entry = require('../Models/Entries'); 
const User = require('../Models/UserInfo');
const Message = require('../Models/Messages');
const Comment = require('../Models/Comments');
const userRoom = require('../Models/Rooms');
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require( 'body-parser');
const socketIO = require('socket.io');
const http = require('http');
const cors  = require("cors");
const session = require('express-session');
const ProfilePic = require('../Models/ProfilePics');
const FriendList = require('../Models/FriendLists');
const multer = require('multer');

//express app
const app = express();
var router = express.Router();
const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});
app.use(cors({origin: 'http://localhost:3000', credentials: true}))

//socket is the connection you have to the specific user
//io is general to all 
io.on('connection', (socket) => { 
    let room = undefined;
    let userName = undefined;
    console.log("user Connected")
    socket.on("disconnect", () => {
        console.log("user Disconnected")
    })
    socket.on("chat message", (data) => {
        console.log("got message", data)
        io.to(room).emit("chat message", data)
    })
    socket.on("join", (data) => {
        socket.join(data.room)
        room = data.room
        userName = data.userName
        console.log("got message", data)
        console.log(`user is joined to room ${data.room}`)
    })

    socket.emit("starting data", {"text": "hi"})
    
})

dotenv.config({path: 'src/server/.env'}); //reads the .env file and parses it
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the static files from the React app
app.use(express.static('src'));
mongoose.connect(process.env.MONGO_URL);
const database = mongoose.connection;
database.on('error', (error) => console.log(error));
database.once('connected', () => {
    console.log('Connected to database'),
    server.listen(process.env.PORT, () => {
        console.log(`Server listening on port ${process.env.PORT}`);
      });
});

const sessionMiddleware = session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
})

app.get('/', (req, res) => {
    console.log("in api home");
});

const createdRooms = [];
app.get('/api/rooms', (req, res) => {
    res.json(createdRooms);
});

app.post('/api/newUserFriendList/:email', (req, res) => {
    console.log("Inside of /api/newUserFriendList");
    try {
      const email = req.params.email;
      const friends = req.body.friends;
  
      FriendList.findOne({ email: email })
        .then((existingFriendList) => {
          if (existingFriendList) {
            // Document with the email already exists, update the friends field
            existingFriendList.friends = friends;
            existingFriendList.save()
              .then((result) => {
                console.log(`Updated ${email}'s friend list in the DB!`);
                // console.log(result);
                res.send(result);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).send('Internal Server Error');
              });
          } else {
            // Document with the email does not exist, create a new one
            const new_entry = new FriendList({
              email: email,
              friends: friends
            });
            new_entry.save()
              .then((result) => {
                console.log(`Added ${email}'s friend list to the DB!`);
                res.send(result);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).send('Internal Server Error');
              });
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send('Internal Server Error');
        });
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  app.post('/api/newUser/:email', (req, res) => {
    console.log("Inside of /api/newUser/:email");
    const email = req.params.email;
    User.findOne({ email: email }) // Check if user with the provided email already exists
      .then((existingUser) => {
        if (existingUser) {
          console.log("User already exists");
          res.send(existingUser); // Return the existing user
        } else {
          const newEntry = new User({ email: email }); // Create a new user entry
          newEntry.save()
            .then((result) => {
              console.log("Added a new user to the DB");
              res.send(result); // Return the newly created user
            })
            .catch((err) => {
              console.log(err);
              res.status(500).send("Internal Server Error");
            });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Internal Server Error");
      });
  });

app.post('/api/updateBirthday/:email', (req, res) => {
  console.log("Inside of /api/newBirthday/:email");
  const email = req.body.email;
  const birthday = req.body.birthday;
  User.findOneAndUpdate(
    { email: email }, // Filter to find the specific user by email
    { birthday: birthday }, // Update the birthday field
    { new: true } // Return the updated user after the update
  )
    .then((updatedUser) => {
      if (updatedUser) {
        console.log("Updated birthday for the user with email:", email);
        console.log("Updated with birthday:", birthday);
        res.send(updatedUser);
      } else {
        console.log("User not found");
        res.status(404).send("User not found");
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });
});

app.post('/api/updateAboutMe/:email/:aboutme', (req, res) => {
  console.log("Inside of /api/newUser/:email/:aboutme");
  const email = req.params.email;
  const aboutme = req.params.aboutme;
  User.findOneAndUpdate(
    { email: email }, // Filter to find the specific user by email
    { aboutme: aboutme }, // Update the aboutme field
    { new: true } // Return the updated user after the update
  )
    .then((updatedUser) => {
      if (updatedUser) {
        console.log("Updated aboutme for the user with email:", email);
        res.send(updatedUser);
      } else {
        console.log("User not found");
        res.status(404).send("User not found");
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });
});


app.post('/api/newEntry', (req, res) => { //add the newEntry to the DB
    console.log(req.body.mood);
    const new_entry = new Entry({
        user: req.body.user,
        title: req.body.title,
        text: req.body.entry,
        mood: req.body.mood
    });

    new_entry.save()
        .then((result) => {
            console.log("Sent your entry to the DB!");
            // res.redirect('http://localhost:3000/Entries')
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
        });
});

app.post('/api/newMessage', (req, res) => {
    const room = req.body.room;
    const userName = req.body.username; // Corrected typo in "username" variable name
    const message = req.body.message;
  
    // Find the document for the specified room
    Message.findOne({ room: room })
      .then((foundMessage) => {
        if (foundMessage) {
          // Append the new message to the existing messages array
          foundMessage.messages.push({
            user: userName,
            message: message
          });
  
          // Save the updated document
          return foundMessage.save();
        } else {
          // If the document for the specified room doesn't exist, create a new one
          const newMessage = new Message({
            room: room,
            messages: [{
              user: userName,
              message: message
            }]
          });
  
          // Save the new document
          return newMessage.save();
        }
      })
      .then(() => {
        console.log("Sent your message to the DB!");
        res.status(200).json({ message: 'Message saved successfully' });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Failed to save the message' });
      });
  });

  app.post('/api/newComment', (req, res) => {
    const entry = req.body.entry_id;
    const userName = req.body.username; // Corrected typo in "username" variable name
    const comment = req.body.comment;
    const rating = req.body.rating;
  
    // Find the document for the specified room
    Comment.findOne({ entry_id: entry })
      .then((foundComment) => {
        if (foundComment) {
          // Append the new message to the existing messages array
          foundComment.comments.push({
            user: userName,
            comment: comment,
            rating: rating
          });
  
          // Save the updated document
          return foundComment.save();
        } else {
          // If the document for the specified room doesn't exist, create a new one
          console.log(rating)
          const newComment = new Comment({
            entry_id: entry,
            comments: [{
              user: userName,
              comment: comment,
              rating: rating
            }]
          });
  
          // Save the new document
          return newComment.save();
        }
      })
      .then(() => {
        console.log("Sent your comment to the DB!");
        res.status(200).json({ message: 'Comment saved successfully' });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Failed to save the comment' });
      });
  });

  app.post('/api/newRoom/:user/:room', (req, res) => {
    console.log("Inside of /api/newRoom/:user/:room");
    const { user, room } = req.params;
    userRoom.findOne({ user })
      .then((userDoc) => {
        if (userDoc) {
          // Check if the room already exists in the user's rooms array
          if (userDoc.rooms.includes(room)) {
            throw new Error("Room already exists for the user");
          }
          userDoc.rooms.push(room); // Append the new room to the existing rooms array
          return userDoc.save(); // Save the updated user document
        } else {
          return userRoom.create({ user, rooms: [room] }); // Create a new user document with the new room
        }
      })
      .then((result) => {
        console.log("Sent your room to the DB!");
        res.send(result);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Internal Server Error");
      });
  });
  
  app.get('/api/getUserInfo/:email', (req, res) => {
    const email = req.params.email;
    User.findOne({ email: email })
      .then((user) => {
        if (user) {
          const { aboutme, birthday } = user;
          console.log("About Me:", aboutme);
          console.log("Birthday:", birthday);
          res.send({ aboutme, birthday });
        } else {
          console.log("User not found");
          res.status(404).send("User not found");
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Internal Server Error");
      });
  });
  

app.get('/api/allEntries/:user', (req, res) => {
    console.log("Inside of /api/allEntries/:user");
    const user = req.params.user;
    // Entry.find({email})
    Entry.find({user})
        .then((result) => {
            // console.log(result);
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
        })
});

app.get('/api/allUsers', (req, res) => {
    console.log("Inside of /api/allUsers");
    User.find()
        .select('email')
        .then((result) => {
            // console.log(result);
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
        })
});

  
app.get('/api/allMessages/:room', (req, res) => { //get messages of specific room
    console.log("Inside of /api/allMessages/:room");
    const room = req.params.room;
    Message.findOne({room: room}, {'messages.user': 1, 'messages.message': 1})
        .then((result) => {
            console.log(result.messages);
            res.send(result.messages);
        })
        .catch((err) => {
            console.log(err);
        })
});


app.get('/api/allComments/:entry', (req, res) => { //get comments of specific entry
  console.log("Inside of /api/allComments/:entry");
  const entry = req.params.entry;
  Comment.findOne({entry_id: entry}, {'comments.user': 1, 'comments.comment': 1, 'comments.rating': 1})
      .then((result) => {
          console.log(result.comments);
          res.send(result.comments);
      })
      .catch((err) => {
          console.log(err);
      })
});

app.get('/api/allRooms/:user', (req, res) => {
    console.log("Inside /api/allRooms/:user");
    const user = req.params.user;
    userRoom.findOne({ user: user }, { rooms: 1 })
      .then((result) => {
        console.log(result);
        res.send(result);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Internal Server Error");
    });
});
  
app.get('/api/userfriendList/:email', (req, res) => {    
    console.log("Inside of /api/userfriendList/:email");
    const email = req.params.email;
    FriendList.findOne({ email })
        .select('friends')
        .then((result) => {
            // console.log(result.friends);
            res.send(result.friends);
        })
        .catch((err) => {
            console.log(err);
        });
  });
  
  app.delete('/api/deleteEntry/:id', (req, res) => {
    const entryId = req.params.id;
    Entry.findByIdAndDelete(entryId)
      .then(() => {
        console.log(`Entry with ID ${entryId} deleted successfully.`);
        // res.sendStatus(200);
        res.json({ message: 'Entry deleted successfully' });
      })
      .catch((err) => {
        console.error(`Error deleting entry with ID ${entryId}:`, err);
        res.sendStatus(500);
      });
  });

  app.put('/api/upVote/:entry_id/:index', (req, res) => {
    const entryId = req.params.entry_id;
    const index = req.params.index;
    Comment.findOne(
      {entry_id: entryId }).then((doc) => {
        console.log(doc.comments[index]._id)
        const comment_id = doc.comments[index]._id;
          Comment.updateMany(
            { "comments._id": comment_id},
            { $inc: { "comments.$.rating": 1 } },
            {new: true}
          ).then((comment) => {
              console.log(comment);
              console.log("Updated your comment on the DB!");
              res.status(200).json({ message: 'Comment updated successfully' });
            })
            .catch((err) => {
              console.log(err);
              res.status(500).json({ error: 'Failed to update the comment' });
            });
      }
      )
  })

  app.put('/api/downVote/:entry_id/:index', (req, res) => {
    const entryId = req.params.entry_id;
    const index = req.params.index;
    Comment.findOne(
      {entry_id: entryId }).then((doc) => {
        console.log(doc.comments[index]._id)
        const comment_id = doc.comments[index]._id;
          Comment.updateMany(
            { "comments._id": comment_id},
            { $inc: { "comments.$.rating": -1 } },
            {new: true}
          ).then((comment) => {
              console.log(comment);
              console.log("Updated your comment on the DB!");
              res.status(200).json({ message: 'Comment updated successfully' });
            })
            .catch((err) => {
              console.log(err);
              res.status(500).json({ error: 'Failed to update the comment' });
            });
      }
      )
  })

  app.get('/api/getVote/:entry_id/:index', (req, res) => {
    const entryId = req.params.entry_id;
    const index = req.params.index;
  
    Comment.findOne({ entry_id: entryId })
      .then((doc) => {
        if (doc) {
          const comment = doc.comments[index];
          if (comment) {
            console.log(comment);            
            const commentRating = comment.rating;
            res.status(200).json({ rating: commentRating });
          } else {
            res.status(404).json({ error: 'Comment not found' });
          }
        } else {
          res.status(404).json({ error: 'Entry not found' });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Failed to retrieve the comment rating' });
      });
  });
