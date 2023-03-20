const mongoose = require('mongoose');

const newsSchema = {
	title: String,
	content: String,
	img: {
        data: Buffer,
        contentType: String
    }
}

module.exports = new mongoose.model('News', newsSchema);
