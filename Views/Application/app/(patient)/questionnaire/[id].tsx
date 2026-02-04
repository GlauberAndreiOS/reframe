import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {GlassInput} from '@/components/ui/glass-input';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Toast, ToastType} from '@/components/ui/toast';

interface Questionnaire {
    id: string;
    title: string;
    questions: {
        title: string;
        type: 'text' | 'select' | 'radio' | 'checkbox';
        data: string[];
    }[];
}

export default function AnswerQuestionnaireScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();
	const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
	const [loading, setLoading] = useState(true);
	const [answers, setAnswers] = useState<Record<string, any>>({});
	const [submitting, setSubmitting] = useState(false);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	useEffect(() => {
		const fetchQuestionnaire = async () => {
			try {
				const response = await api.get(`/Questionnaire/${id}`, {
					headers: {Authorization: `Bearer ${token}`}
				});
				setQuestionnaire(response.data);
			} catch (error) {
				console.error('Error fetching questionnaire:', error);
				setToast({message: 'Não foi possível carregar o questionário.', type: 'error'});
			} finally {
				setLoading(false);
			}
		};

		if (id) void fetchQuestionnaire();
	}, [id, token]);

	const handleAnswerChange = (questionTitle: string, value: any) => {
		setAnswers(prev => ({
			...prev,
			[questionTitle]: value
		}));
	};

	const toggleCheckbox = (questionTitle: string, option: string) => {
		const current = answers[questionTitle] || [];
		const updated = current.includes(option)
			? current.filter((item: string) => item !== option)
			: [...current, option];
		handleAnswerChange(questionTitle, updated);
	};

	const handleSubmit = async () => {
		if (!questionnaire) return;

		setSubmitting(true);
		try {
			const payload = {
				questionnaireId: questionnaire.id,
				answers: Object.entries(answers).map(([key, value]) => ({
					questionTitle: key,
					value: value
				}))
			};

			await api.post('/Questionnaire/Response', payload, {
				headers: {Authorization: `Bearer ${token}`}
			});

			setToast({message: 'Respostas enviadas com sucesso!', type: 'success'});
			setTimeout(() => {
				router.back();
			}, 1000);
		} catch (error) {
			console.error('Error submitting answers:', error);
			setToast({message: 'Não foi possível enviar as respostas.', type: 'error'});
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={primaryColor}/>
			</ThemedView>
		);
	}

	if (!questionnaire) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ThemedText style={{color: '#EF4444'}}>Questionário não encontrado.</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
			<AmbientBackground/>
			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle" numberOfLines={1} style={{flex: 1, textAlign: 'center'}}>
					{questionnaire.title}
				</ThemedText>
				<View style={{width: 24}}/>
			</View>

			<ScrollView style={styles.content}>
				{questionnaire.questions.map((q, index) => (
					<Card key={index} style={styles.card}>
						<ThemedText type="defaultSemiBold"
							style={styles.questionTitle}>{index + 1}. {q.title}</ThemedText>

						{q.type === 'text' && (
							<GlassInput
								placeholder="Sua resposta..."
								value={answers[q.title] || ''}
								onChangeText={(text) => handleAnswerChange(q.title, text)}
								multiline
								style={{minHeight: 80, textAlignVertical: 'top'}}
							/>
						)}

						{q.type === 'select' && (
							<View style={styles.optionsContainer}>
								{q.data.map((option, optIdx) => (
									<TouchableOpacity
										key={optIdx}
										style={[
											styles.optionButton,
											{borderColor: borderColor},
											answers[q.title] === option && {
												borderColor: primaryColor,
												backgroundColor: primaryColor + '20'
											}
										]}
										onPress={() => handleAnswerChange(q.title, option)}
									>
										<ThemedText style={[
											styles.optionText,
											answers[q.title] === option && {color: primaryColor, fontWeight: '600'}
										]}>{option}</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{q.type === 'radio' && (
							<View style={styles.optionsContainer}>
								{q.data.map((option, optIdx) => (
									<TouchableOpacity
										key={optIdx}
										style={styles.radioRow}
										onPress={() => handleAnswerChange(q.title, option)}
									>
										<View style={[
											styles.radioCircle,
											{borderColor: borderColor},
											answers[q.title] === option && {
												borderColor: primaryColor,
												backgroundColor: primaryColor
											}
										]}/>
										<ThemedText style={styles.radioText}>{option}</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{q.type === 'checkbox' && (
							<View style={styles.optionsContainer}>
								{q.data.map((option, optIdx) => {
									const isSelected = (answers[q.title] || []).includes(option);
									return (
										<TouchableOpacity
											key={optIdx}
											style={styles.checkboxRow}
											onPress={() => toggleCheckbox(q.title, option)}
										>
											<View style={[
												styles.checkboxBox,
												{borderColor: borderColor},
												isSelected && {borderColor: primaryColor, backgroundColor: primaryColor}
											]}>
												{isSelected && <IconSymbol name="checkmark" size={16} color="#fff"/>}
											</View>
											<ThemedText style={styles.checkboxText}>{option}</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						)}
					</Card>
				))}

				<TouchableOpacity
					style={[
						styles.submitButton,
						{backgroundColor: primaryColor},
						submitting && styles.submitButtonDisabled
					]}
					onPress={handleSubmit}
					disabled={submitting}
				>
					{submitting ? (
						<ActivityIndicator color="#fff"/>
					) : (
						<ThemedText style={styles.submitButtonText}>Enviar Respostas</ThemedText>
					)}
				</TouchableOpacity>
				<View style={{height: 80}}/>
			</ScrollView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		paddingTop: 50,
		borderBottomWidth: 1,
	},
	content: {
		paddingHorizontal: 20,
	},
	card: {
		marginBottom: 16,
	},
	questionTitle: {
		marginBottom: 12,
	},
	optionsContainer: {
		gap: 8,
	},
	optionButton: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	optionText: {
		fontSize: 14,
	},
	radioRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		marginRight: 10,
	},
	radioText: {
		fontSize: 16,
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	checkboxBox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		marginRight: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxText: {
		fontSize: 16,
	},
	submitButton: {
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		marginTop: 20,
	},
	submitButtonDisabled: {
		opacity: 0.7,
	},
	submitButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
