import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ExperienceWithSkills } from "~/server/functions";

// Theme definitions
export const cvThemes = {
  classic: {
    name: "Classique",
    primary: "#1e4080",
    secondary: "#e8eef7",
    text: "#1a1a1a",
    textMuted: "#666666",
    textLight: "#444444",
  },
  modern: {
    name: "Moderne",
    primary: "#0f172a",
    secondary: "#f1f5f9",
    text: "#0f172a",
    textMuted: "#64748b",
    textLight: "#475569",
  },
  elegant: {
    name: "Élégant",
    primary: "#7c2d41",
    secondary: "#fdf2f4",
    text: "#1a1a1a",
    textMuted: "#6b7280",
    textLight: "#4b5563",
  },
  nature: {
    name: "Nature",
    primary: "#166534",
    secondary: "#dcfce7",
    text: "#1a1a1a",
    textMuted: "#6b7280",
    textLight: "#4b5563",
  },
  minimal: {
    name: "Minimal",
    primary: "#000000",
    secondary: "#f5f5f5",
    text: "#000000",
    textMuted: "#737373",
    textLight: "#525252",
  },
} as const;

export type CVTheme = keyof typeof cvThemes;

const createStyles = (theme: typeof cvThemes[CVTheme]) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: "Helvetica",
      fontSize: 11,
      lineHeight: 1.5,
    },
    header: {
      marginBottom: 20,
      borderBottom: `2 solid ${theme.primary}`,
      paddingBottom: 15,
    },
    name: {
      fontSize: 28,
      fontFamily: "Helvetica-Bold",
      color: theme.text,
      marginBottom: 5,
    },
    email: {
      fontSize: 12,
      color: theme.textMuted,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      color: theme.primary,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    experienceItem: {
      marginBottom: 15,
    },
    jobTitle: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: theme.text,
    },
    company: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: theme.primary,
      marginTop: 2,
    },
    dates: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    description: {
      fontSize: 10,
      color: theme.textLight,
      marginTop: 6,
      textAlign: "justify",
    },
    skillsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 6,
    },
    skill: {
      backgroundColor: theme.secondary,
      color: theme.primary,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 10,
      fontSize: 8,
    },
    allSkillsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    allSkill: {
      backgroundColor: theme.secondary,
      color: theme.primary,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      fontSize: 9,
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 9,
      color: "#999999",
    },
  });

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

interface CVDocumentProps {
  profile: Profile;
  experiences: ExperienceWithSkills[];
  theme?: CVTheme;
}

export function CVDocument({ profile, experiences, theme = "classic" }: CVDocumentProps) {
  const styles = createStyles(cvThemes[theme]);

  const formatDate = (date: string) => {
    const [year, month] = date.split("-");
    const months = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  // Collect all unique skills from experiences
  const allSkills = Array.from(
    new Map(
      experiences.flatMap(exp => exp.skills || []).map(skill => [skill.name.toLowerCase(), skill])
    ).values()
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        {allSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compétences</Text>
            <View style={styles.allSkillsContainer}>
              {allSkills.map((skill) => (
                <Text key={skill.id} style={styles.allSkill}>
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expériences Professionnelles</Text>
          {experiences.map((exp) => (
            <View key={exp.id} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.company}>{exp.company}</Text>
              <Text style={styles.dates}>
                {formatDate(exp.startDate)} -{" "}
                {exp.current ? "Présent" : exp.endDate ? formatDate(exp.endDate) : ""}
                {exp.location && ` | ${exp.location}`}
              </Text>
              {exp.description && (
                <View style={styles.description}>
                  {exp.description.split("\n").map((line, i) => (
                    <Text key={i}>{line}</Text>
                  ))}
                </View>
              )}
              {exp.skills && exp.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                  {exp.skills.map((skill) => (
                    <Text key={skill.id} style={styles.skill}>
                      {skill.name}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          CV généré avec CV Generator
        </Text>
      </Page>
    </Document>
  );
}
