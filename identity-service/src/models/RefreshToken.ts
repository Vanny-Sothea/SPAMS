import mongoose from 'mongoose';
const RefreshTokenSchema = new mongoose.Schema({
    token : {
        type : String,
        required : true,
        unique : true
    },
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    expiresAt : {
        type : Date,
        required : true
    }
}, {timestamps : true});

RefreshTokenSchema.index({expiresAt : 1}, {expireAfterSeconds : 0});

export const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
