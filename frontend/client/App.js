import React from "react";
import ReactDOM from "react-dom";
import YouTube from 'react-youtube';
import { post } from "axios";
import Dropzone from "react-dropzone";
import { BarLoader } from "react-spinners";
import { css } from "react-emotion";
import debounce from "lodash/debounce"

import {
	COMIXIFY_API,
	MAX_FILE_SIZE,
	PERMITTED_VIDEO_EXTENSIONS,
    FROM_YOUTUBE_API,
    MIN_RESPONSE_DELAY
} from "./constants";

class App extends React.Component {
	static appStates = {
		INITIAL: 0,
		PROCESSING: 1,
		FINISHED: 2,
		UPLOAD_ERROR: 3,
		DROP_ERROR: 4,
		SAMPLE_PROCESSING: 5
	};
	ytInput = React.createRef();
	constructor(props) {
		super(props);
		this.state = {
			state: App.appStates.INITIAL,
			videoId: null,
			drop_errors: [],
			result_comics: null,
            framesMode: "0",
            rlMode: "0",
            imageAssessment: "0",
			styleTransferMode: "0",
		};
		this.onVideoDrop = this.onVideoDrop.bind(this);
        this.onModelChange = this.onModelChange.bind(this);
        this.handleResponse = debounce(this.handleResponse.bind(this), MIN_RESPONSE_DELAY);
        this.onYouTubeSubmit = this.onYouTubeSubmit.bind(this);
        this.onSamplingChange = this.onSamplingChange.bind(this);
        this.onImageAssessmentChange = this.onImageAssessmentChange.bind(this);
        this.styleTransferChange = this.styleTransferChange.bind(this);
	}
	static onVideoUploadProgress(progressEvent) {
		let percentCompleted = Math.round(
			progressEvent.loaded * 100 / progressEvent.total
		);
		console.log(percentCompleted);
	}
	onModelChange(e) {
        let value = e.currentTarget.value;
	    this.setState({
            rlMode: value
        })
    }
	styleTransferChange(e) {
	    let value = e.currentTarget.value;
	    this.setState({
            styleTransferMode: value
        })
    }
	onSamplingChange(e) {
	    let value = e.currentTarget.value;
	    this.setState({
            framesMode: value
        })
    }
    onImageAssessmentChange(e) {
        let value = e.currentTarget.value;
        this.setState({
            imageAssessment: value
        })
    }
	handleResponse(res) {
	    if(res === "debounce") {
	        return
        }
	    if (res.data["status_message"] === "ok") {
            this.setState({
                state: App.appStates.FINISHED,
                result_comics: res.data["comic"]
            });
        } else {
            this.setState({
                state: App.appStates.UPLOAD_ERROR
            });
        }
    }
	processVideo(video) {
		let { framesMode, rlMode, imageAssessment, styleTransferMode } = this.state;
		let data = new FormData();
		data.append("file", video);
		data.set('frames_mode', parseInt(framesMode));
		data.set('rl_mode', parseInt(rlMode));
		data.set("image_assessment_mode", parseInt(imageAssessment));
		data.set('style_transfer_mode', parseInt(styleTransferMode));
		this.handleResponse("debounce");
		post(COMIXIFY_API, data, {
			headers: { "content-type": "multipart/form-data" },
			onUploadProgress: App.onVideoUploadProgress
		})
			.then(this.handleResponse)
			.catch(err => {
				console.error(err);
				this.setState({
					state: App.appStates.UPLOAD_ERROR
				});
			});
		this.setState({
			state: App.appStates.PROCESSING
		});
	}
	onVideoDrop(files, rejected) {
		if (rejected.length !== 0) {
			console.error(rejected);
			this.setState({
				drop_errors: ["Maximum size for single video is 50MB"],
				state: App.appStates.DROP_ERROR
			});
			return;
		}
		this.processVideo(files[0]);
	}
	submitYouTube(link) {
	    let { framesMode, rlMode, imageAssessment, styleTransferMode } = this.state;
	    this.handleResponse("debounce");
	    post(FROM_YOUTUBE_API, {
		    url: link,
			frames_mode: parseInt(framesMode),
			rl_mode: parseInt(rlMode),
			image_assessment_mode: parseInt(imageAssessment),
			style_transfer_mode: parseInt(styleTransferMode)
        })
			.then(this.handleResponse)
			.catch(err => {
				console.error(err);
				this.setState({
					state: App.appStates.UPLOAD_ERROR
				});
			});
    }
	onYouTubeSubmit() {
		let ytLink = this.ytInput.current.value;
		this.submitYouTube(ytLink);
		this.setState({
			state: App.appStates.PROCESSING
		});
	}
	onSamplePlay(videoId) {
	    let link = "https://www.youtube.com/watch?v=" + videoId;
	    this.submitYouTube(link);
		this.setState({
			videoId: videoId,
			state: App.appStates.SAMPLE_PROCESSING
		});
	}
	render() {
		let {
		    state, drop_errors, result_comics, framesMode, rlMode, videoId, imageAssessment, styleTransferMode
		} = this.state;
		let showUsage = [
			App.appStates.INITIAL,
			App.appStates.UPLOAD_ERROR,
			App.appStates.DROP_ERROR,
			App.appStates.FINISHED
		].includes(state);
		let isProcessing = [
			App.appStates.SAMPLE_PROCESSING,
			App.appStates.PROCESSING
		].includes(state);
		return (
			<div>
				{state === App.appStates.FINISHED && [
					<img key="1" src={result_comics} />,
					<p key="2">Go again:</p>
				]}
				{state === App.appStates.DROP_ERROR &&
					drop_errors.map((o, i) => <p key={i}>{o}</p>)}
				{state === App.appStates.UPLOAD_ERROR && (
					<p>Server Error: Please try again later.</p>
				)}
				{showUsage && (
				    <div>
                        <div>Pipeline settings:</div>
                        <div>
                            <span>Frame sampling:</span>
                            <input
                                type="radio"
                                name="sampling"
                                id="sampling-0"
                                value="0"
                                checked={framesMode === "0"}
                                onChange={this.onSamplingChange}
                            />
                            <label htmlFor="sampling-0">2fps sampling</label>
                            <input
                                type="radio"
                                name="sampling"
                                id="sampling-1"
                                value="1"
                                checked={framesMode === "1"}
                                onChange={this.onSamplingChange}
                            />
                            <label htmlFor="sampling-1">I-frame sampling</label>
                        </div>
                        <div>
                            <span>Extraction model:</span>
                            <input
                                type="radio"
                                name="model"
                                id="model-0"
                                value="0"
                                checked={rlMode === "0"}
                                onChange={this.onModelChange}
                            />
                            <label htmlFor="model-0">Basic model</label>
                            <input
                                type="radio"
                                name="model"
                                id="model-1"
                                value="1"
                                checked={rlMode === "1"}
                                onChange={this.onModelChange}
                            />
                            <label htmlFor="model-1">+VTW model</label>
                        </div>
						<div>
                            <span>Image assessment:</span>
                            <input
                                type="radio"
                                name="image-assessment"
                                id="image-assessment-0"
                                value="0"
                                checked={imageAssessment === "0"}
                                onChange={this.onImageAssessmentChange}
                            />
							<label htmlFor="image-assessment-0">NIMA</label>
                            <input
                                type="radio"
                                name="image-assessment"
                                id="image-assessment-1"
                                value="1"
                                checked={imageAssessment === "1"}
                                onChange={this.onImageAssessmentChange}
                            />
                            <label htmlFor="image-assessment-1">Popularity</label>
						</div>
                        <div>
                            <span>Style Transfer model:</span>
                            <input
                                type="radio"
                                name="style-model"
                                id="style-model-0"
                                value="0"
                                checked={styleTransferMode === "0"}
                                onChange={this.styleTransferChange}
                            />
                            <label htmlFor="style-model-0">ComixGAN</label>
                            <input
                                type="radio"
                                name="style-model"
                                id="style-model-1"
                                value="1"
                                checked={styleTransferMode === "1"}
                                onChange={this.styleTransferChange}
                            />
                            <label htmlFor="style-model-1">CartoonGAN-Hayao</label>
                            <input
                                type="radio"
                                name="style-model"
                                id="style-model-2"
                                value="2"
                                checked={styleTransferMode === "2"}
                                onChange={this.styleTransferChange}
                            />
                            <label htmlFor="style-model-2">CartoonGAN-Hosoda</label>
                        </div>
                    </div>
				)}
				{showUsage && (
					<Dropzone
						onDrop={this.onVideoDrop}
						accept={PERMITTED_VIDEO_EXTENSIONS}
						maxSize={MAX_FILE_SIZE}
						className="dropzone"
						acceptClassName="dropzone--accepted"
						rejectClassName="dropzone--rejected"
						multiple={false} // Only one video at the time
					>
						<p>Drop video here, or click to select manually</p>
					</Dropzone>
				)}
				{showUsage && (
					<div>
						<label htmlFor="yt-link" className="yt-label">Or use YouTube link:</label>
						<input type="url" id="yt-link" ref={this.ytInput}/>
						<button onClick={this.onYouTubeSubmit}>Run</button>
						<div className="yt-clips-label">Or select one of sample videos:</div>
						<div className="youtube-clips">
                            <div>
                                <div className="yt-clip-label">Movie scene</div>
                                <YouTube
                                    videoId="pvAhRcUofDk"
                                    opts={{
                                        height: '90',
                                        width: '150',
                                    }}
                                    onPlay={this.onSamplePlay.bind(this, "pvAhRcUofDk")}
                                />
                            </div>
                            <div>
                                <div className="yt-clip-label">Movie scene</div>
                                <YouTube
                                    videoId="CvvAftMZYKM"
                                    opts={{
                                        height: '90',
                                        width: '150',
                                    }}
                                    onPlay={this.onSamplePlay.bind(this, "CvvAftMZYKM")}
                                />
                            </div>
                            <div>
                                <div className="yt-clip-label">Music</div>
                                <YouTube
                                    videoId="Es3Vsfzdr14"
                                    opts={{
                                        height: '90',
                                        width: '150',
                                    }}
                                    onPlay={this.onSamplePlay.bind(this, "Es3Vsfzdr14")}
                                />
                            </div>
                            <div>
                                <div className="yt-clip-label">Superhero</div>
                                <YouTube
                                    videoId="sO5zEIclVw8"
                                    opts={{
                                        height: '90',
                                        width: '150',
                                    }}
                                    onPlay={this.onSamplePlay.bind(this, "sO5zEIclVw8")}
                                />
						    </div>
						</div>
					</div>
				)}
				{state === App.appStates.SAMPLE_PROCESSING && (
					<YouTube
						videoId={videoId}
						opts={{
							height: '390',
							width: '640',
							playerVars: {
								autoplay: 1
							}
						}}
					/>
				)}
				{isProcessing && (
					<BarLoader
						color={"rgb(54, 215, 183)"}
						className={css`
							margin: 20px auto 0 auto;
						`}
						width={10}
						widthUnit="rem"
					/>
				)}
			</div>
		);
	}
}

ReactDOM.render(<App />, document.getElementById("demo"));
