import { ApolloServer, UserInputError, gql, AuthenticationError }  from 'apollo-server'
import {  ApolloServerPluginLandingPageGraphQLPlayground} from "apollo-server-core";
import { 	v1 as uuid } from 'uuid'
import  mongoose from 'mongoose'
import Person from './models/person.js'
import User from './models/user.js'
import jwt from 'jsonwebtoken'
import  dotenv from 'dotenv'


dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI 
const JWT_SECRET =  process.env.JWT_SECRET 

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })



const typeDefs = gql`
  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }
  type Address {
    street: String!
    city: String! 
  }
  
  enum YesNo {
    YES
    NO
  }
  type User {
    username: String!
    friends: [Person!]!
    id: ID!
  }
  
  type Token {
    value: String!
  }
  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person!]!
	allUsers: [User!]!
    findPerson(name: String!): Person
	findUser(username: String!): User
    me: User
  }
  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person

    editNumber(
      name: String!
      phone: String!
    ): Person

    createUser(
      username: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token

    addAsFriend(
      name: String!
    ): User
  }  
`



const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root, args) => {
      	if (!args.phone) {
			return await Person.find({})
		}
    	return await Person.find({ phone: { $exists: args.phone === 'YES' } })
    },
    findPerson: async (root, args) =>  await Person.findOne({ name: args.name }),
	findUser: async (root, args) =>  await User.findOne({ username: args.username }).populate('friends'),
	allUsers: async (root, args) => {  

		const users =await User.find({ }).populate('friends')		
		return users   
    	
    },
	me: (root, args, context) => {
		return context.currentUser
	}
  },
  Person: {
    address: (root) => {
      return { 
        street: root.street,
        city: root.city
      }
    }
  },
   Mutation: {
    addPerson: (root, args) => {
      const person = new Person({ ...args })
      return person.save()
    },
    editNumber: async (root, args) => {
      const person = await Person.findOneAndUpdate({ name: args.name }, {phone: args.phone}, {new:true})
      //person.phone = args.phone
      return person //person.save()
    },
	createUser: (root, args) => {
		const user = new User({ username: args.username })

		return user.save()
		.catch(error => {
			throw new UserInputError(error.message, {
				invalidArgs: args,
			})
		})
	},
	login: async (root, args) => {
		const user = await User.findOne({ username: args.username })

		if ( !user || args.password !== 'secret' ) {
			throw new UserInputError("wrong credentials")
		}

		const userForToken = {
			username: user.username,
			id: user._id,
		}

		return { value: jwt.sign(userForToken, JWT_SECRET) }
	},
	addAsFriend: async (root, args, { currentUser }) => {
			
		const nonFriendAlready = (person) => 
			!currentUser.friends.map(f => f._id.toString()).includes(person._id.toString())

		if (!currentUser) {
			throw new AuthenticationError("not authenticated")
		}

	
		const person = await Person.findOne({ name: args.name })
		console.log(nonFriendAlready(person), person._id, currentUser.friends.map(f => f._id))
		if(nonFriendAlready(person)){
			currentUser.friends = currentUser.friends.concat(person)		
			await User.findByIdAndUpdate( currentUser._id,  currentUser)
		
		}
		
		return await User.findById(currentUser._id).populate('friends')

	
	
	
  	},
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
   plugins: [
    ApolloServerPluginLandingPageGraphQLPlayground(),
  ],
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id).populate('friends')
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
}) 