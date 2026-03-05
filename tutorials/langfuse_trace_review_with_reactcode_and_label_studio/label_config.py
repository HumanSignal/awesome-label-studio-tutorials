# ReactCode 3-panel trace annotation config for LLM trace review
# Loaded by the notebook. ReactCode template lives in template.js (same directory).

from pathlib import Path

_TEMPLATE_JS = (Path(__file__).parent / "template.js").read_text()

LABEL_CONFIG_XML = f'''<View>
  <ReactCode style="height: 95vh" name="trace" toName="trace" outputs='{{"trace_id":"string","turn_id":"string","turn_role":"string","verdict":"string","failure_modes":"array","severity":"string","expected_behavior":"string","comments":"string"}}'>
    <![CDATA[
    {_TEMPLATE_JS}
    ]]>
  </ReactCode>
</View>'''
