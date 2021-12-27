import React ,  { useState } from 'react'
import {  useQuery , useApolloClient } from '@apollo/client'
import Persons from './components/Persons'
import PersonForm from './components/PersonForm'
import LoginForm from './components/LoginForm'
import { ALL_PERSONS } from './querys'
import Notify from './components/Notify'
import PhoneForm from './components/PhoneForm'


const App = () => {
  const result = useQuery(ALL_PERSONS )
  const [errorMessage, setErrorMessage] = useState(null)
  const [token, setToken] = useState(null)
  const client = useApolloClient()

  const notify = (message) => {
		setErrorMessage(message)
		setTimeout(() => {
			setErrorMessage(null)
		}, 10000)
	}
	

  const logout = () => {
    setToken(null)
    localStorage.clear()
    client.resetStore()
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  if (!token) {
    return (
      <div>
        <Notify errorMessage={errorMessage} />
        <h2>Login</h2>
        <LoginForm
          setToken={setToken}
          setError={notify}
        />
      </div>
    )
  }

  return (
  	<div>	
		<button onClick={logout}>
			logout
		</button>
	  	<Notify errorMessage={errorMessage} />
    	<Persons persons= {result.data.allPersons} />  
		<PersonForm setError={notify} />
		<PhoneForm setError={notify} />
	</div>
  )
}

export default App