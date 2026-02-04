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
import {Avatar} from '@/components/ui/avatar';

interface Questionnaire {
    id: string;
    title: string;
    questions: {
        title: string;
        type: 'text' | 'select' | 'radio' | 'checkbox';
        data: string[];
    }[];
}

interface Answer {
    questionTitle: string;
    value: any;
}

interface QuestionnaireResponse {
    questionnaire: Questionnaire;
    answers: Answer[];
    patient: {
        user: {
            name: string;
        };
        profilePictureUrl?: string;
    };
    submittedAt: string;
}

export default function ViewResponseScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();
	const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
	const [loading, setLoading] = useState(true);
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
		const fetchResponse = async () => {
			try {
				const apiResponse = await api.get(`/Questionnaire/Response/${id}`, {
					headers: {Authorization: `Bearer ${token}`}
				});
				setResponse(apiResponse.data);
			} catch (error) {
				console.error('Error fetching response:', error);
				setToast({message: 'Não foi possível carregar a resposta.', type: 'error'});
			} finally {
				setLoading(false);
			}
		};

		if (id) void fetchResponse();
	}, [id, token]);
	
	const getAnswerForQuestion = (questionTitle: string) => {
		return response?.answers.find(a => a.questionTitle === questionTitle)?.value;
	}

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={primaryColor}/>
			</ThemedView>
		);
	}

	if (!response) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ThemedText style={{color: '#EF4444'}}>Resposta não encontrada.</ThemedText>
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
				<View style={{flex: 1, alignItems: 'center'}}>
					<View style={{marginBottom: 8}}>
						<Avatar 
							uri={response.patient?.profilePictureUrl} 
							size={40} 
							editable={false}
							name={response.patient?.user?.name}
						/>
					</View>
					<ThemedText type="subtitle" numberOfLines={1}>
						{response.questionnaire.title}
					</ThemedText>
					<ThemedText style={styles.headerSubtitle}>
						Respondido por {response.patient?.user?.name || 'Paciente desconhecido'} em {new Date(response.submittedAt).toLocaleDateString()}
					</ThemedText>
				</View>
				<View style={{width: 24}}/>
			</View>

			<ScrollView style={styles.content}>
				{response.questionnaire.questions.map((q, index) => {
					const answer = getAnswerForQuestion(q.title);
                    
					return (
						<Card key={index} style={styles.card}>
							<ThemedText type="defaultSemiBold"
								style={styles.questionTitle}>{index + 1}. {q.title}</ThemedText>

							{q.type === 'text' && (
								<GlassInput
									value={String(answer || '')}
									editable={false}
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
												answer === option && {
													borderColor: primaryColor,
													backgroundColor: primaryColor + '20'
												}
											]}
											disabled
										>
											<ThemedText style={[
												styles.optionText,
												answer === option && {color: primaryColor, fontWeight: '600'}
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
											disabled
										>
											<View style={[
												styles.radioCircle,
												{borderColor: borderColor},
												answer === option && {
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
										const isSelected = (answer || []).includes(option);
										return (
											<TouchableOpacity
												key={optIdx}
												style={styles.checkboxRow}
												disabled
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
					)
				})}
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
	headerSubtitle: {
		fontSize: 12,
		opacity: 0.7,
		marginTop: 2,
		textAlign: 'center',
	},
	content: {
		padding: 20,
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
});
