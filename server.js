const express = require ('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const {graphqlHTTP} = require('express-graphql');
const {buildSchema} = require('graphql');
const bodyParser = require('body-parser');
const Event = require('./models/event')
const User = require('./models/user')
const bcrypt = require('bcryptjs')

require('dotenv').config();

const app = express();

const events = [];

//middlewares
app.use('/uploads',express.static('uploads'));
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// mongo uri important boilerplate
//ATLAS_URI is the uri that i got from my mongo atlas, written on the env file
const uri = process.env.ATLAS_URI;
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true,useUnifiedTopology: true }
);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

//api routes
// const apiRouter = require('./routes/logregister');

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema(`
        type Event {
          _id: ID!
          title: String!
          description: String!
          price: Float!
          date: String!
        }

        type User {
          _id: ID!
          email: String!
          password: String
        }

        input EventInput {
          title: String!
          description: String!
          price: Float!
          date: String!
        }

        input UserInput {
          email: String!
          password: String!
        }

        type RootQuery {
            events: [Event!]!
            users: [User!]!
        }
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User

        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then(events => {
            return events.map(event => {
              return { ...event._doc, _id: event.id };
            });
          })
          .catch(err => {
            throw err;
          });
      },
      createEvent: args => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date)
        });
        return event
          .save()
          .then(result => {
            console.log(result);
            return { ...result._doc, _id: result._doc._id.toString() };
          })
          .catch(err => {
            console.log(err);
            throw err;
          });
      },


      users: () => {
        return User.find()
          .then(users => {
            return users.map(user => {
              return { ...user._doc, _id: user.id };
            });
          })
          .catch(err => {
            throw err;
          });
      },

      createUser: args => {

         return User.findOne({email: args.userInput.email})
         .then(user=> {
            if(user){
              throw new Error('email exists already');
            }
            return bcrypt.hash(args.userInput.password,12)
         }).then(hashedPassword=>{
          const user = new User({
            email: args.userInput.email,
            password: hashedPassword
          })
          return user.save()
        })
        .then(result=>{
          return {...result._doc, _id: result._doc._id.toString()}
        })
        .catch(err => {
          throw(err)
        })
        
        
      }
    },
    graphiql: true
  })
);

//serve static assets if in production
if(process.env.NODE_ENV === 'production'){
  //set static folder
  app.use(express.static('client/build'));

  app.get('*',(req,res)=>{
    res.sendFile(path.resolve(__dirname,'client','build','index.html'))
  })
}

//listen ports
const port = process.env.PORT || 5002;

app.listen(port, ()=>{
    console.log(`server started at ${port}`);
})
