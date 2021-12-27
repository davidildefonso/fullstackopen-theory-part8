import { PubSub } from 'graphql-subscriptions';
import Person from './models/person.js'
import User from './models/user.js'
import {  UserInputError,  AuthenticationError }  from 'apollo-server-express'
import jwt from 'jsonwebtoken'
import  dotenv from 'dotenv'

dotenv.config()

const pubsub = new PubSub();
const JWT_SECRET =  process.env.JWT_SECRET 

export const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root, args) => {
      	if (!args.phone) {
			return await Person.find({}).populate('friendOf')
		}
    	return await Person.find({ phone: { $exists: args.phone === 'YES' } }).populate('friendOf')
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
	addPerson: async (root, args, context) => {
      const person = new Person({ ...args })
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      try {
        await person.save()
        currentUser.friends = currentUser.friends.concat(person)       
		await User.findByIdAndUpdate( currentUser._id,  {friends : currentUser.friends.concat(person)})
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      pubsub.publish('PERSON_ADDED', { personAdded: person })

      return person
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
  },
  Subscription: {
    personAdded: {
      subscribe: () => pubsub.asyncIterator(['PERSON_ADDED'])
    },
  },
}