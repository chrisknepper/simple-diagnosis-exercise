import React, { Component } from 'react';

const AJAX_SUPPORTED = ('fetch' in window);
const BASE_URL = 'http://localhost:1337';

const initialState = {
	step: 'start',
	symptomValue: '',
	symptoms: [],
	initialDiagnosis: '',
	alternateDiagnoses: [],
	finalDiagnosis: ''
}

export default class App extends Component {

	constructor(props) {
		super(props);
		this.state = {
			...initialState
		};

		this.getSymptomsList = this.getSymptomsList.bind(this);
		this.handleSymptomSelect = this.handleSymptomSelect.bind(this);
		this.determineInitialDiagnosis = this.determineInitialDiagnosis.bind(this);
		this.handleDiagnosisCorrect = this.handleDiagnosisCorrect.bind(this);
		this.handleDiagnosisWrong = this.handleDiagnosisWrong.bind(this);
		this.restart = this.restart.bind(this);
		this.renderCurrentStep = this.renderCurrentStep.bind(this);
		this.renderStart = this.renderStart.bind(this);
		this.renderInitialDiagnosis = this.renderInitialDiagnosis.bind(this);
		this.renderAlternateDiagnoses = this.renderAlternateDiagnoses.bind(this);
	}

	componentDidMount() {
		this.getSymptomsList();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.step !== 'start' && this.state.step === 'start') {
			this.getSymptomsList();
		}
	}

	getSymptomsList() {
		if (!AJAX_SUPPORTED) {
			console.warn('You\'re using a browser without fetch. Ajax will not work!');
		} else {
			fetch(`${BASE_URL}/full_list`)
			.then(value => value.json())
			.then((res) => {
				console.log('value', Object.keys(res));
				const defaultSelectOption = {
					label: 'Symptoms...',
					value: ''
				};
				const symptoms = [defaultSelectOption].concat(Object.keys(res).map((symptom) => ({
					value: symptom,
					label: symptom
				})));
				this.setState({
					symptoms
				});
			})
		}
	}

	handleSymptomSelect(event) {
		console.log('the selected symptom is', event.target.value);
		const selectedSymptom = event.target.value;
		this.setState({
			symptomValue: selectedSymptom
		}, () => {
			this.sendSymptomToServer(selectedSymptom);
		});
	}

	sendSymptomToServer(symptom) {
		if (symptom && symptom.length) {
			fetch(`${BASE_URL}/select_diagnosis_for_symptom`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({symptom})
			})
			.then(value => value.json())
			.then(res => {
				console.log('server response', res);
				if (res.length) {
					this.determineInitialDiagnosis(res);
				}
			})
		}
	}

	determineInitialDiagnosis(diagnosisList) {
		const anyDiagnosesMoreLikelyThanOthers = diagnosisList.some((diagnosis) => {
			return parseInt(diagnosis[diagnosis.length - 1], 10) !== 0;
		});

		let chosenDiagnosis;
		let alternateDiagnoses;
		const sortedDiagnoses = diagnosisList.sort((one, two) => { // sort and serve
			const firstFrequency = parseInt(one[one.length - 1], 10);
			const secondFrequency = parseInt(two[two.length - 1], 10);
			return secondFrequency - firstFrequency;
		});

		if (anyDiagnosesMoreLikelyThanOthers) {
			chosenDiagnosis = sortedDiagnoses[0];
			const temp = [...sortedDiagnoses]; // really wish that JS array .shift returned the shifted array (it doesn't)
			temp.shift();
			alternateDiagnoses = temp;
		} else {
			// Give a random diagnosis since none are more likely than others
			// Would be better to use a legit array-shuffling algorithm here
			const randomIndex = Math.floor(Math.random() * diagnosisList.length);
			chosenDiagnosis = sortedDiagnoses[randomIndex];
			const temp = [...sortedDiagnoses]; // really wish that JS array .splice returned the spliced array (it doesn't)
			temp.splice(randomIndex, 1);
			alternateDiagnoses = temp
		}

		this.setState({
			step: 'initialDiagnosis',
			initialDiagnosis: chosenDiagnosis,
			alternateDiagnoses: alternateDiagnoses
		});
	}

	handleDiagnosisCorrect(event) {
		const selectedDiagnosis = event.target.dataset.diagnosis;

		if (selectedDiagnosis) {
			fetch(`${BASE_URL}/update_diagnosis_count`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					symptom: this.state.symptomValue,
					diagnosis: selectedDiagnosis
				})
			})
			.then(value => value.json())
			.then(res => {
				console.log('server response', res);
				if (res.length) {
					this.setState({
						step: 'final',
						finalDiagnosis: selectedDiagnosis
					});
				}
			})
		}
	}

	handleDiagnosisWrong(event) {
		const incorrectDiagnosis = event.target.dataset.diagnosis;
		console.log('not cool', event.target.dataset.diagnosis, this.state.symptoms);
		this.setState({
			step: 'alternateDiagnoses'
		});
	}

	restart() {
		this.setState({
			...initialState
		});
	}

	renderStart() {
		if (this.state.symptoms.length) {
			return (
				<div>
					<h2>Please tell us what's making you feel bad</h2>
					<select
						value={this.state.symptomValue}
						onChange={this.handleSymptomSelect}
					>
						{
							this.state.symptoms.map((symptom) => {
								return (
									<option
										key={symptom.label}
										value={symptom.value}
										label={symptom.label} />
								);
							})
						}
					</select>
				</div>
			);
		}
	}

	renderFinal() {
		return (
			<div>
				<h2>
					So it turns out you have <span className="finalDiagnosis">{this.state.finalDiagnosis.substring(0, this.state.finalDiagnosis.length - 2)}
					</span>
				</h2>
				<h3>Feel better soon!</h3>
				<button data-diagnosis={this.state.initialDiagnosis} onClick={this.restart}>
					Start over
				</button>
			</div>
		)
	}

	renderInitialDiagnosis() {
		return (
			<div>
				<h2>
					It sounds like you have <span className="initialDiagnosis">{this.state.initialDiagnosis.substring(0, this.state.initialDiagnosis.length - 2)}
					</span>
				</h2>
				<h3>Is this correct?</h3>
				<button className="success" data-diagnosis={this.state.initialDiagnosis} onClick={this.handleDiagnosisCorrect}>
					Yep, that's me!
				</button>
				<button className="fail" data-diagnosis={this.state.initialDiagnosis} onClick={this.handleDiagnosisWrong}>
					I don't think so.
				</button>
			</div>
		)
	}

	renderAlternateDiagnoses() {
		return (
			<div>
				<h2>Sorry we couldn't figure out what is ailing you.</h2>
				<h3>Do any of these sound correct?</h3>
				{
					this.state.alternateDiagnoses.map((diagnosis, index) => {
						const diagnosisToDisplay = diagnosis.substring(0, diagnosis.length - 2);
						return (
							<div key={`alt_diagnosis_${index}`} className="alternativeDiagnosisButtonContainer">
								<button data-diagnosis={diagnosis} onClick={this.handleDiagnosisCorrect}>
									{ diagnosisToDisplay }
								</button>
							</div>
						)
					})
				}
			</div>
		)
	}

	renderCurrentStep() {
		switch(this.state.step) {
			case 'initialDiagnosis':
				return this.renderInitialDiagnosis();
			case 'alternateDiagnoses':
				return this.renderAlternateDiagnoses();
			case 'final':
				return this.renderFinal();
			default:
				return this.renderStart();
		}
	}

	render() {
		return (
			<div>
				<h1>Welcome to SimpleDiagnosis</h1>
				{ this.renderCurrentStep() }
			</div>
		);
	}
}
