import  mongoose from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person'
    }
  ],
})

schema.plugin(uniqueValidator)
const User =  mongoose.model('User', schema)
export default User
