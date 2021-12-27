import { ApolloServer,  }  from 'apollo-server-express'
import {  ApolloServerPluginLandingPageGraphQLPlayground, ApolloServerPluginDrainHttpServer  } from "apollo-server-core";
import { 	v1 as uuid } from 'uuid'
import express from 'express';
import http from 'http';
import  mongoose from 'mongoose'

import User from './models/user.js'
import jwt from 'jsonwebtoken'
import  dotenv from 'dotenv'
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const  { makeExecutableSchema }  = require('@graphql-tools/schema')
const {subscribe  , execute}  = require('graphql')

import {typeDefs} from './typeDefs.js'
import {resolvers} from './resolvers.js'





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

mongoose.set('debug', true);


async function startApolloServer(typeDefs, resolvers) {  
	const app = express();
	const httpServer = http.createServer(app);
	const PORT = 4000;	

	const schema = makeExecutableSchema({ typeDefs, resolvers });
	
	const server = new ApolloServer({
		schema,
		plugins: [
			ApolloServerPluginLandingPageGraphQLPlayground(),
			ApolloServerPluginDrainHttpServer({ httpServer }),
			{
				async serverWillStart() {
					return {
						async drainServer() {
							subscriptionServer.close();
						}
					};
				}
			}	
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

	await server.start();
	server.applyMiddleware({ app });
	
	const subscriptionServer = SubscriptionServer.create(
		{ schema, execute, subscribe },
		{ server: httpServer,  path: server.graphqlPath  }
	);




	httpServer.listen(PORT, () => {
		console.log(
			`🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
		);
		console.log(
			`🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
		);
	});


}


startApolloServer(typeDefs, resolvers)