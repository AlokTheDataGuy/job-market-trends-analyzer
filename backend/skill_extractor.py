# skill_extractor.py - Enhanced skill extraction for Indian tech market
import re
import logging
from typing import List, Dict
from models import ExtractedSkill, SkillCategory

logger = logging.getLogger(__name__)

class EnhancedSkillExtractor:
    def __init__(self):
        # Expanded tech skills mapping for Indian market
        self.TECH_SKILLS = {
            SkillCategory.programming: [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin',
                'scala', 'golang', 'go', 'rust', 'perl', 'r', 'matlab', 'dart', 'cobol', 'fortran',
                'assembly', 'vb.net', 'objective-c', 'shell scripting', 'powershell', 'bash'
            ],
            SkillCategory.frontend: [
                'react', 'angular', 'vue.js', 'vue', 'svelte', 'html5', 'html', 'css3', 'css', 'sass', 'scss',
                'less', 'bootstrap', 'tailwind css', 'material ui', 'antd', 'jquery', 'backbone.js',
                'ember.js', 'webpack', 'vite', 'parcel', 'rollup', 'next.js', 'nuxt.js', 'gatsby'
            ],
            SkillCategory.backend: [
                'node.js', 'nodejs', 'express.js', 'express', 'django', 'flask', 'fastapi', 'spring boot',
                'spring', 'laravel', 'codeigniter', 'symfony', 'rails', 'ruby on rails', 'asp.net',
                'nest.js', 'koa.js', 'hapi.js', 'gin', 'echo', 'fiber', 'actix', 'rocket'
            ],
            SkillCategory.databases: [
                'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'elasticsearch', 'solr',
                'sqlite', 'oracle', 'sql server', 'dynamodb', 'couchdb', 'neo4j', 'influxdb',
                'clickhouse', 'mariadb', 'firestore', 'realm', 'hbase', 'couchbase'
            ],
            SkillCategory.cloud: [
                'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
                'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'gitlab ci', 'gitlab', 'github actions',
                'circleci', 'travis ci', 'helm', 'istio', 'consul', 'vault', 'nomad', 'prometheus',
                'grafana', 'elk stack', 'datadog', 'newrelic', 'cloudformation', 'pulumi'
            ],
            SkillCategory.mobile: [
                'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova', 'phonegap',
                'native script', 'unity', 'unreal engine', 'ar', 'vr', 'arkit', 'arcore'
            ],
            SkillCategory.data: [
                'machine learning', 'ml', 'artificial intelligence', 'ai', 'deep learning', 'nlp',
                'computer vision', 'data science', 'data analytics', 'pandas', 'numpy', 'scipy',
                'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'spark', 'pyspark', 'hadoop',
                'hive', 'pig', 'kafka', 'airflow', 'dbt', 'snowflake', 'databricks', 'tableau',
                'power bi', 'qlik', 'looker', 'jupyter', 'r studio', 'stata', 'sas'
            ],
            SkillCategory.tools: [
                'git', 'github', 'gitlab', 'bitbucket', 'svn', 'jira', 'confluence', 'slack', 'teams',
                'figma', 'sketch', 'adobe xd', 'invision', 'postman', 'insomnia', 'swagger', 'openapi',
                'linux', 'ubuntu', 'centos', 'debian', 'windows server', 'macos', 'vim', 'vscode',
                'intellij', 'eclipse', 'sublime', 'atom', 'nginx', 'apache', 'tomcat', 'iis'
            ]
        }

        # Normalization map for overlapping/alias skills
        self.normalization_map = {
            "gitlab ci": "gitlab",
            "github actions": "github",
            "amazon web services": "aws",
            "microsoft azure": "azure",
            "gcp": "google cloud",
            "vue.js": "vue",
            "express.js": "express",
            "node.js": "nodejs",
            "next.js": "nextjs",
            "nuxt.js": "nuxtjs"
        }

        # Compile regex patterns for better performance
        self._compile_patterns()

        # Context-aware skill detection
        self.skill_contexts = {
            'experience': r'(\d+[\+\-]?)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience\s*)?(?:in\s*|with\s*)?',
            'proficiency': r'(?:expert|proficient|skilled|experienced|knowledge)\s*(?:in\s*|with\s*)?',
            'requirement': r'(?:required|must\s*have|should\s*have|need)\s*(?:knowledge\s*of\s*)?'
        }

    def _compile_patterns(self):
        """Pre-compile regex patterns for performance"""
        self.compiled_patterns = {}
        for category, skills in self.TECH_SKILLS.items():
            patterns = []
            for skill in skills:
                escaped_skill = re.escape(skill)
                if '.' in skill:
                    pattern = escaped_skill.replace(r'\.', r'\.?')
                else:
                    pattern = r'\b' + escaped_skill + r'\b'
                patterns.append(pattern)

            self.compiled_patterns[category] = re.compile(
                '|'.join(patterns),
                re.IGNORECASE | re.MULTILINE
            )

    def extract_skills_enhanced(self, description: str, title: str = "", requirements: str = "") -> List[ExtractedSkill]:
        """Enhanced skill extraction with context awareness, deduplication, and normalization"""
        if not description:
            return []

        full_text = f"{title} {description} {requirements}".lower()

        found_skills = []
        skill_scores = {}

        for category, pattern in self.compiled_patterns.items():
            matches = pattern.finditer(full_text)
            for match in matches:
                raw_skill = match.group().lower().strip()

                # Normalize skill name
                skill_name = self.normalization_map.get(raw_skill, raw_skill)

                if len(skill_name) < 2:
                    continue

                confidence = self._calculate_skill_confidence(skill_name, full_text, match.start())

                if skill_name not in skill_scores or skill_scores[skill_name][1] < confidence:
                    skill_scores[skill_name] = (category, confidence)

        for skill_name, (category, confidence) in skill_scores.items():
            if confidence > 0.3:
                try:
                    found_skills.append(ExtractedSkill(skill=skill_name, category=category))
                except Exception as e:
                    logger.warning(f"Error creating ExtractedSkill for {skill_name}: {e}")

        return found_skills

    def _calculate_skill_confidence(self, skill: str, text: str, position: int) -> float:
        confidence = 0.5
        start = max(0, position - 50)
        end = min(len(text), position + len(skill) + 50)
        context = text[start:end]

        if re.search(self.skill_contexts['experience'] + skill, context, re.IGNORECASE):
            confidence += 0.3
        if re.search(self.skill_contexts['proficiency'] + skill, context, re.IGNORECASE):
            confidence += 0.2
        if re.search(self.skill_contexts['requirement'], context, re.IGNORECASE):
            confidence += 0.2
        if '@' in context or 'http' in context or '.com' in context:
            confidence -= 0.4

        return min(1.0, max(0.0, confidence))
