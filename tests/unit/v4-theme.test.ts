import {describe,it,expect} from 'vitest';
import {parseTheme} from '../../src/theme/theme';
describe('independent theme preferences',()=>{
  it('starts on the existing plain paper without inspecting system mode',()=>{expect(parseTheme(null)).toEqual({mode:'manual',value:'plain'});});
  it('restores manual dark paper and explicit system mode',()=>{expect(parseTheme('{"mode":"manual","value":"ink"}')).toEqual({mode:'manual',value:'ink'});expect(parseTheme('{"mode":"system","value":"bamboo"}')).toEqual({mode:'system',value:'bamboo'});});
  it('rejects corrupt, unknown and imported document data',()=>{for(const input of ['{','{}','null','{"schemaVersion":1}','{"mode":"manual","value":"unknown"}','{"mode":"evil","value":"ink"}'])expect(parseTheme(input)).toEqual({mode:'manual',value:'plain'});});
});
