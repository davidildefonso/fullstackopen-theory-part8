import {  gql }  from 'apollo-server-express'

export const typeDefs = gql`
  type Person {
    name: String!
    phone: String
    address: Address!
	friendOf: [Person!]!
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



	type Subscription {
		personAdded: Person!
	}  


`
