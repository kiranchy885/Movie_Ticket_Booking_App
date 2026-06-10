import React, { useState } from 'react'
import { dummyTrailers } from '../assets/assets'
import BlurCircle from './BlurCircle'


const TrailerSection = () => {
    const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0])
    
    return (
        <div className='px-6 md:16 lg:px-24 xl:px-44 py-20 overflow-hidden'>
            <p className='text-gray-300 font-medium text-lg max-w[960px
            mx-auto'>Trailers</p>

        <div className='relative mt-6'>
            <BlurCircle />
            <ReactPlayer url={currentTrailer.videoUrl} controls={false}
            className="mx-auto max-w-full" width="960px" height="540px"/>
        </div>
        </div>
    )
}

export default TrailerSection