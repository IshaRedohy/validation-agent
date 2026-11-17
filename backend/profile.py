"""Illustrative policy: never substitute this for an approved client methodology."""
PROFILE = {
    'id': 'illustrative-fmea-v1', 'version': 1, 'illustrative': True,
    'name': 'Illustrative FMEA — testing only',
    'rating_min': 1, 'rating_max': 5, 'formula': 'severity * probability * detectability',
    'thresholds': [{'max': 19, 'class': 'Low'}, {'max': 49, 'class': 'Medium'}, {'max': 125, 'class': 'High'}],
    'detectability_direction': 'Higher means harder to detect',
}

def classify(score, profile=PROFILE):
    return next(t['class'] for t in profile['thresholds'] if score <= t['max'])
